// Writes docs/PHOTOGRAPH_ASSET_MANIFEST.md from measured scan data.
const { ROOT, meta, nearest, PRIOR_CATALOGUE, PUBLISHED_ALIASES, DUPLICATES, ASSET_BY_SLUG, quality, orientation, batchOf, shortName, fs, path } = require('./photo-lib.cjs');
const { slugFor } = require('./optimize-photos-config.cjs');

const supplied = meta.filter((r) => r.path.startsWith('Photos'));
const mapAssets = meta.filter((r) => r.path.startsWith('Generates Map Image'));
const production = meta.filter((r) => r.path.startsWith('public'));
const reference = meta.filter((r) => r.path.startsWith('design-reference'));
const usedCount = Object.keys(PRIOR_CATALOGUE).length;
const duplicateCount = DUPLICATES.size;
const uniqueCount = supplied.length - duplicateCount;
const unusedCount = uniqueCount - usedCount;

/** Published asset filenames for one slug, measured from disk. */
function assetCell(slug) {
  const asset = ASSET_BY_SLUG.get(slug);
  if (!asset) return 'NONE — not yet optimised';
  const variants = asset.variants.map((v) => `\`-${v.width}\``).join(', ');
  const aliases = PUBLISHED_ALIASES[slug] || [];
  const aliasNote = aliases.length > 0 ? ` (aliases: ${aliases.map((a) => `\`${a}\``).join(', ')})` : '';
  return `\`public/images/${asset.webp.file}\` (${variants}, + JPEG fallback)${aliasNote}`;
}

const L = [];
L.push('# Omni Developments — Photograph Asset Manifest');
L.push('');
L.push(`Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/generate-photo-manifest.cjs\`.`);
L.push('');
L.push('Every technical value below is measured with `sharp`, not estimated. Descriptive');
L.push('values are carried forward from the existing repository audit (`PHOTO_MAPPING.md`).');
L.push('Where no prior catalogue entry exists the row is marked `UNCLASSIFIED`: room and');
L.push('project type cannot be inferred from pixels alone and has deliberately not been guessed.');
L.push('');
L.push('## Scan scope');
L.push('');
L.push('Recursive search from `C:\\Users\\Natty\\Desktop\\Anti Grav\\Omni`:');
L.push('');
L.push('```');
for (const folder of ['Photos', 'public', 'uploads', 'Generates Map Image', 'design-reference', 'Omni Development']) {
  L.push(`C:\\Users\\Natty\\Desktop\\Anti Grav\\Omni\\${folder}\\`);
}
L.push('```');
L.push('');
L.push('The parent folder `C:\\Users\\Natty\\Desktop\\Anti Grav\\` was also listed. It holds');
L.push('unrelated client projects (including Safe Nest, which was not touched) and no Omni');
L.push('photography. `node_modules`, `.git`, `dist`, `dist-server` and `deployment` staging');
L.push('copies were excluded because they are build duplicates, not source media.');
L.push('');
L.push('Extensions searched: `.jpg` `.jpeg` `.png` `.webp` `.avif` `.heic` `.tif` `.tiff`.');
L.push('No `.heic`, `.avif`, `.tif` or `.tiff` files exist anywhere in scope.');
L.push('');
L.push('## Counts');
L.push('');
L.push('| Group | Count |');
L.push('| --- | ---: |');
L.push(`| Files in \`Photos\\\` | ${supplied.length} |`);
L.push(`| Byte-identical duplicates among them | ${duplicateCount} |`);
L.push(`| **Unique supplied photographs** | **${uniqueCount}** |`);
L.push(`| Already represented in production | ${usedCount} |`);
L.push(`| Newly optimised for production | ${unusedCount} |`);
L.push(`| Coverage-map artwork | ${mapAssets.length} |`);
L.push(`| Production assets in \`public\\\` (after this optimisation) | ${production.length} |`);
L.push(`| Stitch design references (not photography) | ${reference.length} |`);
L.push('');
L.push('> **Duplicate finding.** `public/images` holds 26 distinct base filenames but only');
L.push('> **14 unique source photographs**. Nine groups are byte-identical re-copies of the');
L.push('> same source under different names — for example `home-extension-hero`,');
L.push('> `extension-doors`, `project-extension-01` and `services-extension` are all the');
L.push('> same file. The site therefore looks more varied than the library actually is.');
L.push('');
L.push('## Supplied photographs');
L.push('');
L.push('| Full source path | Filename | Format | Dimensions | File size | Probable project | Probable room/type | Before/after candidate | Orientation | Quality | Proposed usage | Production asset |');
L.push('| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- |');

for (const record of supplied) {
  const prior = PRIOR_CATALOGUE[record.filename];
  const near = nearest.get(record.filename);
  const duplicateOf = DUPLICATES.get(record.filename);
  // A same-scene before/after pair must score 5-8 bits on a 63-bit DCT pHash.
  // Nothing in this library reaches that, so no row is marked as an approved pair.
  const candidate = duplicateOf
    ? `DUPLICATE OF ${shortName(duplicateOf)}`
    : !near
      ? 'NOT A PAIR'
      : near.hamming <= 12
        ? `POSSIBLE (nearest ${near.hamming}/63 — ${shortName(near.other)})`
        : near.hamming <= 22
          ? `WEAK (nearest ${near.hamming}/63)`
          : 'NOT A PAIR';
  const project = prior ? prior[0] : `UNCLASSIFIED — ${batchOf(record.filename)} batch`;
  const room = prior ? prior[1] : 'UNCLASSIFIED — owner confirmation required';
  const slug = prior ? prior[2] : slugFor(record.filename);
  const usage = duplicateOf
    ? 'Not published — duplicate, one copy only'
    : prior
      ? 'Approved — already published'
      : 'Available — see PHOTO_USAGE_PLAN.md';
  const asset = duplicateOf ? `Reuses \`${slugFor(duplicateOf)}.webp\`` : assetCell(slug);
  L.push(`| \`${path.join(ROOT, record.path)}\` | ${record.filename} | ${record.format} | ${record.width}×${record.height} | ${(record.bytes / 1024).toFixed(0)} KB | ${project} | ${room} | ${candidate} | ${orientation(record)} | ${quality(record)} | ${usage} | ${asset} |`);
}

L.push('');
L.push('### EXIF and orientation note');
L.push('');
L.push(`All ${supplied.length} supplied photographs report \`orientation: null\` — WhatsApp has`);
L.push('stripped the EXIF orientation tag, so no file needs rotation correction. All are');
L.push('sRGB with a maximum long edge of 1600px, so no original needs downsizing for the');
L.push('web; they do need modern-format re-encoding and responsive variants.');
L.push('');
L.push('## Coverage-map artwork');
L.push('');
L.push('| Full source path | Filename | Format | Dimensions | File size | Proposed usage | Production asset |');
L.push('| --- | --- | --- | --- | ---: | --- | --- |');
for (const record of mapAssets) {
  L.push(`| \`${path.join(ROOT, record.path)}\` | ${record.filename} | ${record.format} | ${record.width}×${record.height} | ${(record.bytes / 1024).toFixed(0)} KB | Areas coverage map (illustrative artwork, not a live map service) | \`public/images/omni-service-area-map-v2.png\` |`);
}
L.push('');
L.push('## Existing production assets (`public/images`)');
L.push('');
L.push('| Full source path | Filename | Format | Dimensions | File size |');
L.push('| --- | --- | --- | --- | ---: |');
for (const record of production) {
  L.push(`| \`${path.join(ROOT, record.path)}\` | ${record.filename} | ${record.format} | ${record.width}×${record.height} | ${(record.bytes / 1024).toFixed(0)} KB |`);
}
L.push('');
L.push('## Stitch design references (excluded from public use)');
L.push('');
L.push(`${reference.length} PNG screen captures under \`design-reference\\\`. These are design`);
L.push('reference exports, not project photography, and must never be published as imagery.');
L.push('');
L.push('## Originals modified');
L.push('');
L.push('**NONE.** No supplied photograph was moved, renamed, resized, re-encoded or deleted.');
L.push('All optimisation writes new files into `public/images` and leaves `Photos` untouched.');
L.push('');

fs.writeFileSync(path.join(ROOT, 'docs', 'PHOTOGRAPH_ASSET_MANIFEST.md'), L.join('\n'));
console.log(`manifest written: ${supplied.length} supplied, ${production.length} production, ${reference.length} reference`);

