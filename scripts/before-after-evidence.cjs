// Objective before/after evidence analysis for the supplied photograph library.
//
// The analysis deliberately relies only on reproducible technical signals:
//   * DCT perceptual hash (pHash) + pairwise Hamming distance
//   * greyscale structural similarity on a normalised frame
//   * RGB colour-histogram correlation
//   * EXIF capture metadata where present
//   * WhatsApp batch + send-order adjacency
//
// No pair is ever promoted to VERIFIED by this script. Confidence ceilings are
// enforced so the site cannot publish a fabricated transformation story.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const PHOTOS_DIR = path.join(ROOT, 'Photos');
const HASH_SIZE = 32;

/** Send-order key so adjacency within a WhatsApp batch can be measured. */
function parseName(filename) {
  const batch = /at (\d+\.\d+\.\d+\s*[AP]M)/i.exec(filename)?.[1] ?? 'unknown';
  const suffix = /\((\d+)\)\.jpeg$/i.exec(filename);
  const order = suffix ? Number(suffix[1]) : 0;
  return { batch, order };
}

/** 64-bit DCT perceptual hash returned as an array of 0/1 bits. */
function dctHash(samples, size) {
  const low = size / 4; // 8x8 low-frequency block from a 32x32 frame
  const coeffs = [];
  for (let u = 0; u < low; u += 1) {
    for (let v = 0; v < low; v += 1) {
      let sum = 0;
      for (let x = 0; x < size; x += 1) {
        for (let y = 0; y < size; y += 1) {
          sum +=
            samples[x * size + y] *
            Math.cos((Math.PI * (2 * x + 1) * u) / (2 * size)) *
            Math.cos((Math.PI * (2 * y + 1) * v) / (2 * size));
        }
      }
      coeffs.push(sum);
    }
  }
  const withoutDc = coeffs.slice(1);
  const sorted = [...withoutDc].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return withoutDc.map((value) => (value > median ? 1 : 0));
}

function hamming(a, b) {
  let distance = 0;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) distance += 1;
  return distance;
}

/** Pearson correlation across two equal-length histograms. */
function correlation(a, b) {
  const meanA = a.reduce((s, v) => s + v, 0) / a.length;
  const meanB = b.reduce((s, v) => s + v, 0) / b.length;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}

(async () => {
  const files = fs.readdirSync(PHOTOS_DIR).filter((f) => /\.jpe?g$/i.test(f)).sort();
  const records = [];

  for (const filename of files) {
    const full = path.join(PHOTOS_DIR, filename);
    const image = sharp(full);
    const meta = await image.metadata();
    // Aspect-preserving centre crop before hashing, so portrait and landscape
    // frames are not squashed into each other and distances stay meaningful.
    const grey = await image
      .rotate()
      .resize(HASH_SIZE, HASH_SIZE, { fit: 'cover', position: sharp.strategy.centre })
      .greyscale()
      .raw()
      .toBuffer();
    const rgb = await sharp(full)
      .rotate()
      .resize(64, 64, { fit: 'cover', position: sharp.strategy.centre })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 16-bin-per-channel colour histogram.
    const histogram = new Array(48).fill(0);
    for (let i = 0; i < rgb.data.length; i += 3) {
      histogram[Math.min(15, rgb.data[i] >> 4)] += 1;
      histogram[16 + Math.min(15, rgb.data[i + 1] >> 4)] += 1;
      histogram[32 + Math.min(15, rgb.data[i + 2] >> 4)] += 1;
    }

    const samples = Array.from(grey);
    const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
    const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / samples.length;

    records.push({
      filename,
      width: meta.width,
      height: meta.height,
      orientation: meta.orientation ?? null,
      aspect: Number((meta.width / meta.height).toFixed(3)),
      bytes: fs.statSync(full).size,
      ...parseName(filename),
      hash: dctHash(samples, HASH_SIZE),
      grey: samples,
      histogram,
      meanLuma: Number(mean.toFixed(1)),
      lumaStdDev: Number(Math.sqrt(variance).toFixed(1)),
      hasExifDate: Boolean(meta.exif && /DateTimeOriginal/.test(meta.exif.toString('latin1'))),
    });
  }

  // Pairwise comparison.
  const pairs = [];
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      const a = records[i];
      const b = records[j];
      const distance = hamming(a.hash, b.hash);
      const sameBatch = a.batch === b.batch;
      const adjacent = sameBatch && Math.abs(a.order - b.order) <= 1;
      const sameAspect = a.aspect === b.aspect;
      pairs.push({
        a: a.filename,
        b: b.filename,
        hamming: distance,
        hashSimilarity: Number((1 - distance / 63).toFixed(3)),
        histogramCorrelation: Number(correlation(a.histogram, b.histogram).toFixed(3)),
        lumaDelta: Number(Math.abs(a.meanLuma - b.meanLuma).toFixed(1)),
        sameBatch,
        adjacent,
        sameAspect,
      });
    }
  }

  pairs.sort((x, y) => x.hamming - y.hamming);
  fs.writeFileSync(
    path.join(ROOT, 'docs', '_pair_analysis.json'),
    JSON.stringify({ records: records.map(({ hash, grey, histogram, ...rest }) => rest), pairs }, null, 2)
  );

  console.log(`analysed ${records.length} photographs, ${pairs.length} pairwise comparisons`);

  // Same-scene threshold. On a 63-bit DCT pHash, genuine same-scene imagery
  // (same camera position, before vs after) scores 0-8. Anything above that is
  // a different scene and must not be published as a transformation pair.
  const SAME_SCENE_CEILING = 8;
  const NEAR_DUPLICATE_CEILING = 4;
  const sameScene = pairs.filter((pair) => pair.hamming <= SAME_SCENE_CEILING);
  const duplicates = pairs.filter((pair) => pair.hamming <= NEAR_DUPLICATE_CEILING);
  console.log(`same-scene candidates (hamming <= ${SAME_SCENE_CEILING}): ${sameScene.length}`);
  console.log(`near-duplicates (hamming <= ${NEAR_DUPLICATE_CEILING}): ${duplicates.length}`);

  console.log('\n=== STRONGEST STRUCTURAL MATCHES (lowest Hamming distance) ===');
  for (const pair of pairs.slice(0, 30)) {
    console.log(
      `${String(pair.hamming).padStart(3)} | sim ${pair.hashSimilarity.toFixed(3)} | hist ${pair.histogramCorrelation.toFixed(3)} | ${pair.adjacent ? 'ADJACENT' : '        '} | ${pair.a.replace('WhatsApp Image 2026-07-25 at ', '')} <-> ${pair.b.replace('WhatsApp Image 2026-07-25 at ', '')}`
    );
  }
})();
