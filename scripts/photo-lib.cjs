// Generates docs/PHOTOGRAPH_ASSET_MANIFEST.md from the measured scan data.
//
// Every technical column (path, format, dimensions, size, orientation, quality)
// comes from sharp metadata so the manifest cannot drift from reality. The
// descriptive columns are carried forward from the existing repository audit
// (PHOTO_MAPPING.md) where one exists, and are explicitly marked UNCLASSIFIED
// where no prior catalogue entry exists — the scanner cannot infer room types
// from pixels alone and must not guess.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', '_photo_metadata.json'), 'utf8'));
const pairData = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', '_pair_analysis.json'), 'utf8'));
const assetData = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', '_photo_assets.json'), 'utf8'));

/** Files that are a byte-identical re-send of another supplied photograph. */
const DUPLICATES = new Map(assetData.duplicates.map((d) => [d.filename, d.duplicateOf]));
/** Published asset index keyed by slug. */
const ASSET_BY_SLUG = new Map(assetData.assets.map((a) => [a.slug, a]));

/** Prior descriptive catalogue from PHOTO_MAPPING.md (source -> production asset). */
const PRIOR_CATALOGUE = {
  'WhatsApp Image 2026-07-25 at 11.59.05 AM.jpeg': ['Finished bathroom detail', 'Bathroom', 'project-bathroom-01'],
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (1).jpeg': ['External works', 'Garden / landscaping', 'garden-landscaping'],
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (2).jpeg': ['Interior detail', 'Stair / interior', 'interior-stair'],
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (4).jpeg': ['Interior', 'Kitchen / interior', 'site-interior'],
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (6).jpeg': ['Company vehicle', 'Branded Omni van', 'about-omni-van'],
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (8).jpeg': ['Property exterior', 'House front', 'home-front'],
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (9).jpeg': ['External works', 'Driveway', 'driveway-finish'],
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (10).jpeg': ['External works', 'Completed facade', 'completed-facade'],
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (15).jpeg': ['Extension', 'Extension doors / opening', 'home-extension-hero'],
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (17).jpeg': ['External works', 'Garden beds', 'garden-beds'],
  'WhatsApp Image 2026-07-25 at 12.00.26 PM.jpeg': ['Construction progress', 'Site in progress', 'works-site'],
  'WhatsApp Image 2026-07-25 at 12.00.27 PM.jpeg': ['Construction progress', 'Timber frame', 'timber-frame'],
  'WhatsApp Image 2026-07-25 at 12.00.28 PM (18).jpeg': ['Technical detail', 'Insulation detail', 'insulation-detail'],
  'WhatsApp Image 2026-07-25 at 12.00.28 PM (20).jpeg': ['Technical detail', 'Insulated room', 'insulation-room'],
};

/**
 * Byte-identical aliases inside `public/images`, verified by SHA-256 grouping.
 * 26 distinct base filenames resolve to only 14 unique source photographs, so the
 * site currently looks more varied than the library actually is. The first entry
 * of each group is the canonical slug used by the optimisation pipeline.
 */
const PUBLISHED_ALIASES = {
  'project-bathroom-01': ['bathroom-hero', 'services-bathroom'],
  'garden-landscaping': [],
  'interior-stair': ['services-loft'],
  'site-interior': ['services-kitchen'],
  'about-omni-van': ['van-branded'],
  'home-front': [],
  'driveway-finish': [],
  'completed-facade': ['project-renovation-01', 'services-renovation'],
  'home-extension-hero': ['extension-doors', 'project-extension-01', 'services-extension'],
  'garden-beds': [],
  'works-site': [],
  'timber-frame': [],
  'insulation-detail': ['guides-hero'],
  'insulation-room': ['services-refurbishment'],
};

/** Closest structural neighbour per file, from the measured pair analysis. */
const nearest = new Map();
for (const pair of pairData.pairs) {
  // Hamming <= 4 means the same photograph re-sent, which is a duplicate rather
  // than a structural neighbour, so it must not drive the candidate column.
  if (pair.hamming <= 4) continue;
  for (const [key, other] of [[pair.a, pair.b], [pair.b, pair.a]]) {
    const existing = nearest.get(key);
    if (!existing || pair.hamming < existing.hamming) {
      nearest.set(key, { other, hamming: pair.hamming });
    }
  }
}

/** Bits per pixel — a compression/quality indicator for recompressed WhatsApp media. */
function quality(record) {
  if (!record.width || !record.height) return 'UNKNOWN';
  const bpp = (record.bytes * 8) / (record.width * record.height);
  const longEdge = Math.max(record.width, record.height);
  if (longEdge < 900) return `LOW (${longEdge}px long edge)`;
  if (bpp < 0.9) return `ACCEPTABLE (${bpp.toFixed(2)} bpp)`;
  return `GOOD (${bpp.toFixed(2)} bpp)`;
}

function orientation(record) {
  if (!record.width || !record.height) return 'UNKNOWN';
  if (record.width > record.height) return 'Landscape';
  if (record.height > record.width) return 'Portrait';
  return 'Square';
}

function batchOf(filename) {
  const match = /(\d{4}-\d{2}-\d{2}) at (\d+\.\d+\.\d+\s*[AP]M)/i.exec(filename);
  return match ? `${match[1]} ${match[2]}` : 'Unknown batch';
}

function shortName(filename) {
  return filename.replace('WhatsApp Image ', '').replace('.jpeg', '');
}

module.exports = {
  ROOT, meta, pairData, assetData, PRIOR_CATALOGUE, PUBLISHED_ALIASES,
  DUPLICATES, ASSET_BY_SLUG, nearest, quality, orientation, batchOf, shortName, fs, path,
};
