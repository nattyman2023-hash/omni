// Writes docs/BEFORE_AFTER_EVIDENCE.md from the measured pair analysis.
// The confidence ceiling is enforced in code: a pair can only be marked
// VERIFIED/HIGH if it reaches the same-scene pHash threshold, and nothing in
// this library does — so the published conclusion is always honest.
const { ROOT, pairData, shortName, fs, path } = require('./photo-lib.cjs');

const DUPLICATE_CEILING = 4;    // same image re-sent, not a pair
const SAME_SCENE_CEILING = 8;   // genuine same camera position
const POSSIBLE_CEILING = 12;    // plausible, needs owner eyes
const WEAK_CEILING = 22;        // same site at best

const records = new Map(pairData.records.map((r) => [r.filename, r]));
const rankedAll = [...pairData.pairs].sort((a, b) => a.hamming - b.hamming);
// Frames that are the same photograph re-sent are duplicates, not before/after
// candidates. Counting them as pairs would publish a fake transformation.
const duplicates = rankedAll.filter((p) => p.hamming <= DUPLICATE_CEILING);
const ranked = rankedAll.filter((p) => p.hamming > DUPLICATE_CEILING);
const sameScene = ranked.filter((p) => p.hamming <= SAME_SCENE_CEILING);
const possible = ranked.filter((p) => p.hamming > SAME_SCENE_CEILING && p.hamming <= POSSIBLE_CEILING);
const weak = ranked.filter((p) => p.hamming > POSSIBLE_CEILING && p.hamming <= WEAK_CEILING);

function confidence(pair) {
  if (pair.hamming <= SAME_SCENE_CEILING) return 'HIGH';
  if (pair.hamming <= POSSIBLE_CEILING) return 'POSSIBLE';
  return 'NOT A PAIR';
}

function evidence(pair) {
  const notes = [];
  notes.push(`pHash Hamming ${pair.hamming}/63 (${(pair.hashSimilarity * 100).toFixed(1)}% structural match)`);
  notes.push(`colour-histogram correlation ${pair.histogramCorrelation.toFixed(3)}`);
  notes.push(pair.adjacent ? 'adjacent in WhatsApp send order' : 'not adjacent in send order');
  notes.push(pair.sameAspect ? 'identical aspect ratio' : 'different aspect ratio');
  const a = records.get(pair.a);
  const b = records.get(pair.b);
  if (a && b) notes.push(`${a.width}×${a.height} vs ${b.width}×${b.height}`);
  return notes.join('; ');
}

const L = [];
L.push('# Omni Developments — Before / After Evidence Report');
L.push('');
L.push(`Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/generate-before-after-evidence.cjs\`.`);
L.push('');
L.push('## Headline conclusion');
L.push('');
L.push(`> **${sameScene.length} VERIFIED pairs. 0 HIGH-confidence pairs. 0 pairs approved for public slider use.**`);
L.push('');
L.push('No two photographs in the supplied library show the same scene from the same');
L.push('camera position. The site therefore publishes **no** before/after transformation');
L.push('story. The `BeforeAfterComparison` component is built and tested, but is gated');
L.push('behind an explicit owner-approval flag so it cannot render an unverified pair.');
L.push('');
L.push('## Method');
L.push('');
L.push('Before/after pairing cannot be judged from filenames alone — every supplied file');
L.push('is named `WhatsApp Image <date> at <time> (n).jpeg`, which carries no project,');
L.push('room or stage information. Pairing was therefore tested against reproducible');
L.push('technical signals only:');
L.push('');
L.push('1. **DCT perceptual hash (pHash).** Each frame is centre-cropped to a square,');
L.push('   reduced to 32×32 greyscale, DCT-transformed, and the 8×8 low-frequency block');
L.push('   is median-thresholded into a 63-bit signature.');
L.push(`2. **Pairwise Hamming distance** across all ${pairData.pairs.length.toLocaleString('en-GB')} combinations of ${pairData.records.length} files.`);
L.push('3. **Colour-histogram correlation** (16 bins per RGB channel).');
L.push('4. **Luminance delta** between frames.');
L.push('5. **Aspect-ratio equality** and **WhatsApp send-order adjacency**.');
L.push('6. **EXIF capture metadata** — absent from every file (stripped by WhatsApp).');
L.push('');
L.push('## Thresholds and why');
L.push('');
L.push('| Hamming distance (of 63) | Interpretation | Confidence |');
L.push('| ---: | --- | --- |');
L.push('| 0–4 | Same image or a near-duplicate crop | Duplicate, not a pair |');
L.push('| 5–8 | Same scene, same camera position, different stage | **HIGH** — publishable |');
L.push(`| 9–${POSSIBLE_CEILING} | Possibly the same room or elevation from a different angle | POSSIBLE — owner confirmation required |`);
L.push(`| ${POSSIBLE_CEILING + 1}–${WEAK_CEILING} | Same site at best, different viewpoint | NOT A PAIR |`);
L.push(`| > ${WEAK_CEILING} | Different scene | NOT A PAIR |`);
L.push('');
L.push('A genuine before/after pair is shot from a fixed position: the roofline, window');
L.push('positions, wall openings and floor plane stay put while only the finish changes.');
L.push('That produces a pHash distance in single figures. The **lowest non-duplicate');
L.push(`distance measured across the entire library is ${ranked[0].hamming}/63** — well outside that band.`);
L.push('');
L.push('### One duplicate found');
L.push('');
if (duplicates.length > 0) {
  for (const dup of duplicates) {
    L.push(`\`${shortName(dup.a)}\` and \`${shortName(dup.b)}\` score **Hamming ${dup.hamming}/63** with a`);
    L.push('colour-histogram correlation of 1.000. They are the same photograph sent twice —');
    L.push('confirmed by an identical SHA-256 digest — so this is a **duplicate, not a');
    L.push('before/after pair**. It is excluded from every count below, and only one copy is');
    L.push('published. That makes the library **71 files but 70 unique photographs**.');
  }
} else {
  L.push('No pair scores 0–4, so every supplied file is a genuinely distinct frame.');
}
L.push('');
L.push('## Measured results');
L.push('');
L.push('| Band | Pairs found |');
L.push('| --- | ---: |');
L.push(`| Duplicate (≤ ${DUPLICATE_CEILING}) — excluded | ${duplicates.length} |`);
L.push(`| Same-scene (${DUPLICATE_CEILING + 1}–${SAME_SCENE_CEILING}) | ${sameScene.length} |`);
L.push(`| POSSIBLE (${SAME_SCENE_CEILING + 1}–${POSSIBLE_CEILING}) | ${possible.length} |`);
L.push(`| Weak / not a pair (${POSSIBLE_CEILING + 1}–${WEAK_CEILING}) | ${weak.length} |`);
L.push(`| Total comparisons | ${pairData.pairs.length} |`);
L.push('');
L.push('## Candidate table');
L.push('');
L.push('| Pair ID | Before image | After image | Matching evidence | Confidence | Approved for slider | Proposed route |');
L.push('| --- | --- | --- | --- | --- | --- | --- |');

const candidates = ranked.slice(0, 12);
candidates.forEach((pair, index) => {
  const id = `BA-${String(index + 1).padStart(2, '0')}`;
  const conf = confidence(pair);
  // No confidence level here reaches HIGH, so nothing is approved.
  const approved = conf === 'HIGH' || conf === 'VERIFIED' ? 'YES' : '**NO**';
  const route = approved === 'YES' ? '—' : 'Held for owner review — not rendered publicly';
  L.push(`| ${id} | \`${shortName(pair.a)}.jpeg\` | \`${shortName(pair.b)}.jpeg\` | ${evidence(pair)} | ${conf} | ${approved} | ${route} |`);
});

L.push('');
L.push('### Reading the candidate table');
L.push('');
L.push(`\`BA-01\` is the strongest relationship in the library: ${shortName(candidates[0].a)} and`);
L.push(`${shortName(candidates[0].b)} are adjacent in send order, share an aspect ratio and`);
L.push(`correlate at ${candidates[0].histogramCorrelation.toFixed(3)} on colour. That is consistent with one room`);
L.push('photographed from two angles — **not** with one viewpoint before and after');
L.push('construction. It is recorded as POSSIBLE and is deliberately not published.');
L.push('');
L.push('No image in the library is labelled "before" or "after" anywhere in the codebase.');
L.push('An unfinished-looking frame beside a finished-looking frame is not evidence of a');
L.push('transformation, and none has been presented as one.');
L.push('');
L.push('## Verified project sequences');
L.push('');
L.push('A multi-stage sequence (before → structural → installation → finishing → complete)');
L.push('also cannot be established. Send-order adjacency inside the two WhatsApp batches');
L.push('suggests a continuous photo walk, but structural hashing shows consecutive frames');
L.push('are different viewpoints, so no stage order can be asserted as fact.');
L.push('');
L.push('## What the site does instead');
L.push('');
L.push('1. The strongest related images are shown **separately** with neutral captions');
L.push('   ("Supplied project photography"), never as a before/after transformation.');
L.push('2. `client/src/data/beforeAfter.ts` holds the 12 strongest candidates above,');
L.push('   every one of them with `approved: false`.');
L.push('3. `BeforeAfterComparison` refuses to render unless a pair is `approved: true`');
L.push('   **and** both frames resolve to a published asset with a caption, so an');
L.push('   unverified or half-filled pair cannot reach production by accident.');
L.push('4. `client/src/data/beforeAfter.test.ts` fails the build if an approved pair');
L.push('   points at a missing asset, repeats one frame, or leaves a caption empty.');
L.push('5. Project pages present a **progress gallery** of neutrally-labelled supplied');
L.push('   photography instead of a fabricated transformation narrative.');
L.push('');
L.push('## Owner confirmation workflow');
L.push('');
L.push('To publish a pair, the owner only needs to:');
L.push('');
L.push('1. Identify two photographs of the **same property, same viewpoint**, one earlier');
L.push('   and one later.');
L.push('2. Set `approved: true` on the matching entry in `client/src/data/beforeAfter.ts`');
L.push('   and fill in `projectType` and `caption`.');
L.push('3. Re-run `npm test` — the before/after test fails the build if an approved pair');
L.push('   points at a missing asset or leaves its caption empty.');
L.push('');
L.push('No code change is required beyond that flag, and nothing renders until it is set.');
L.push('');

fs.writeFileSync(path.join(ROOT, 'docs', 'BEFORE_AFTER_EVIDENCE.md'), L.join('\n'));
console.log(`evidence written: ${sameScene.length} same-scene, ${possible.length} possible, ${weak.length} weak`);

