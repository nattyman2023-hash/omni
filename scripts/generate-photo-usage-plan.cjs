// Writes docs/PHOTO_USAGE_PLAN.md — a placement plan for all 70 unique photographs.
//
// Honesty rule enforced throughout: a photograph whose subject has NOT been
// confirmed by the owner may only be placed in a content-neutral slot (a gallery
// or strip captioned as supplied project photography). It may never be placed in a
// semantic slot that asserts a specific room or project type, because the subject
// cannot be inferred from pixels and must not be guessed.
const { ROOT, PRIOR_CATALOGUE, PUBLISHED_ALIASES, DUPLICATES, assetData, fs, path } = require('./photo-lib.cjs');

const published = assetData.assets.filter((a) => a.alreadyPublished);
const fresh = assetData.assets.filter((a) => !a.alreadyPublished).sort((a, b) => a.slug.localeCompare(b.slug));
const freshPortrait = fresh.filter((a) => a.orientation === 'portrait');
const freshLandscape = fresh.filter((a) => a.orientation === 'landscape');

/**
 * Content-neutral placements, sized to the measured orientation split
 * (52 portrait / 4 landscape). Every slot is a real route in the public site.
 */
const BUCKETS = [
  { route: '/projects', slot: 'Project gallery grid', shape: 'portrait', count: 14, note: '3:4 cards in a masonry-style grid; the library is portrait-dominant so this is its natural home' },
  { route: '/', slot: 'Homepage "Recent work" rail', shape: 'portrait', count: 8, note: 'Horizontally scrollable portrait card rail, replaces the current repeated imagery' },
  { route: '/services', slot: 'Service process strip', shape: 'portrait', count: 6, note: 'Neutral "how a project runs" strip, not tied to a named trade' },
  { route: '/reviews', slot: 'Project photography beside testimonials', shape: 'portrait', count: 6, note: 'Pairs a photo with a review without claiming the photo is that customer\'s home' },
  { route: '/areas', slot: 'Local works grid', shape: 'portrait', count: 6, note: 'Captioned as supplied project photography across the coverage area' },
  { route: '/how-it-works', slot: 'Stage cards', shape: 'portrait', count: 5, note: 'Illustrates process stages neutrally' },
  { route: '/guides', slot: 'Article figures', shape: 'portrait', count: 5, note: 'In-body figures for guide pages' },
  { route: '/about', slot: 'On-site imagery', shape: 'portrait', count: 2, note: 'Supports the about narrative' },
  { route: '/contact', slot: 'Wide reassurance panel', shape: 'landscape', count: 2, note: 'One of only four landscape frames available, so it is spent on the widest slot' },
  { route: '/quote', slot: 'Wide reassurance panel', shape: 'landscape', count: 2, note: 'Shares the landscape pool with /contact' },
];

const L = [];
L.push('# Omni Developments — Photograph Usage Plan');
L.push('');
L.push(`Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/generate-photo-usage-plan.cjs\`.`);
L.push('');
L.push('Covers every one of the **70 unique supplied photographs**: 14 already published,');
L.push('56 newly optimised and awaiting placement, and 1 byte-identical duplicate that is');
L.push('deliberately not published twice.');
L.push('');
L.push('## The governing honesty rule');
L.push('');
L.push('> A photograph whose **subject has not been confirmed by the owner** may only be');
L.push('> placed in a **content-neutral slot** — a gallery, rail or strip captioned as');
L.push('> supplied project photography. It may **never** be placed in a semantic slot that');
L.push('> asserts a specific room or project type (a "Kitchen renovations" card, for');
L.push('> example), because the subject cannot be inferred from pixels and must not be');
L.push('> guessed. Publishing an unverified photo under a specific trade label would be a');
L.push('> false claim about work Omni may not have done.');
L.push('');
L.push('This is why 56 photographs are placed in neutral slots rather than being sprayed');
L.push('across every service card: it uses the whole library while keeping every caption');
L.push('true.');
L.push('');
L.push('## Measured orientation constraint');
L.push('');
L.push('| Group | Portrait (3:4) | Landscape | Total |');
L.push('| --- | ---: | ---: | ---: |');
L.push(`| Already published | ${published.filter((a) => a.orientation === 'portrait').length} | ${published.filter((a) => a.orientation === 'landscape').length} | ${published.length} |`);
L.push(`| Newly optimised | ${freshPortrait.length} | ${freshLandscape.length} | ${fresh.length} |`);
L.push('');
L.push('The unused library is **overwhelmingly portrait**. That has a direct design');
L.push('consequence:');
L.push('');
L.push('- Portrait frames belong in **tall cards, rails and grids** — which is how they');
L.push('  are planned below.');
L.push('- They must **not** be forced into full-bleed wide heroes. Filling a 21:9 hero');
L.push('  from a 3:4 frame needs roughly 60% of the image cropped away, which risks');
L.push('  distortion and misleading framing. Wide slots therefore draw on the small');
L.push('  landscape pool plus the already-published landscape assets.');
L.push('- No asset is stretched. Every `<img>` uses `object-fit: cover` inside a');
L.push('  container whose ratio matches the source, or `contain` where the whole frame');
L.push('  must be seen.');
L.push('');
// Resolve live usage for already-published assets by grepping the real source
// tree. This is authoritative, unlike restating the legacy audit from memory,
// and it surfaces assets that are shipped but never referenced.
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.sql', '.css', '.html']);

function collectSourceFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') continue;
        stack.push(full);
      } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        out.push(full);
      }
    }
  }
  return out;
}

const SOURCE_INDEX = [...collectSourceFiles(path.join(ROOT, 'client', 'src')),
  ...collectSourceFiles(path.join(ROOT, 'database'))]
  .map((file) => {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    return { rel, text: fs.readFileSync(file, 'utf8') };
  })
  // The generated asset table is a catalogue, not evidence of live usage.
  .filter((entry) => !entry.rel.endsWith('data/photoAssets.ts'));

function usageFor(slug) {
  const names = [slug, ...(PUBLISHED_ALIASES[slug] || [])];
  // Match on the filename with its extension so that, for example, `home-front`
  // does not falsely match `home-front-elevation`.
  const pattern = new RegExp(`(?:^|[^\\w-])(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\.(?:webp|jpe?g|png)`, 'i');
  const hits = new Set();
  for (const { rel, text } of SOURCE_INDEX) {
    if (pattern.test(text)) hits.add(rel);
  }
  if (hits.size === 0) return 'No live reference found in `client/src` or `database`';
  return [...hits].sort().map((hit) => `\`${hit}\``).join('<br>');
}

L.push('## Category A — Approved and already published (14)');
L.push('');
L.push('Subject confirmed by the existing repository audit. These keep their descriptive');
L.push('filenames and their current routes; the optimisation pipeline measured them but');
L.push('did not re-encode them, so live imagery is byte-for-byte unchanged.');
L.push('');
L.push('| Slug | Source photograph | Confirmed subject | Orientation | Live usage in source (grep-verified) |');
L.push('| --- | --- | --- | --- | --- |');
for (const asset of published.sort((a, b) => a.slug.localeCompare(b.slug))) {
  const prior = PRIOR_CATALOGUE[asset.source];
  const subject = prior ? `${prior[0]} — ${prior[1]}` : 'Unconfirmed';
  L.push(`| \`${asset.slug}\` | ${asset.source} | ${subject} | ${asset.orientation} ${asset.webp.width}×${asset.webp.height} | ${usageFor(asset.slug)} |`);
}
L.push('');

// Surface assets that are shipped to production but referenced nowhere in the
// app. These are real waste: bytes deployed and cached that no visitor ever sees.
const unreferenced = published
  .filter((asset) => usageFor(asset.slug).startsWith('No live reference'))
  .map((asset) => {
    const aliases = PUBLISHED_ALIASES[asset.slug] || [];
    return `\`${asset.slug}\`${aliases.length > 0 ? ` (aliases: ${aliases.map((a) => `\`${a}\``).join(', ')})` : ''}`;
  });
if (unreferenced.length > 0) {
  L.push(`> **Shipped but unreferenced.** ${unreferenced.length} published asset${unreferenced.length === 1 ? '' : 's'} —`);
  L.push(`> ${unreferenced.join(', ')} — ${unreferenced.length === 1 ? 'is' : 'are'} deployed to \`public/images\``);
  L.push('> (with `-640`, `-960` and JPEG fallback variants) but referenced by no page,');
  L.push('> component or migration. The subject is confirmed, so these are the safest');
  L.push('> candidates to reuse for the neutral slots below rather than reaching for an');
  L.push('> unconfirmed photograph. Nothing here should be deleted without owner sign-off,');
  L.push('> because a deployed deployment package or the database may still reference it.');
  L.push('');
}
L.push('## Category B — Newly optimised, content-neutral placement (56)');
L.push('');
L.push('Every one of these is now a production-ready asset with WebP, `-960`, `-640` and');
L.push('JPEG fallback variants. They are assigned below to neutral slots only. **Each row');
L.push('still requires owner confirmation before its caption may name a room, trade or');
L.push('project type.**');
L.push('');
L.push('| Slug | Source photograph | Orientation | Dimensions | Proposed route | Proposed slot | Owner confirmation |');
L.push('| --- | --- | --- | --- | --- | --- | --- |');

const portraitQueue = [...freshPortrait];
const landscapeQueue = [...freshLandscape];
for (const bucket of BUCKETS) {
  const queue = bucket.shape === 'portrait' ? portraitQueue : landscapeQueue;
  for (let i = 0; i < bucket.count; i += 1) {
    const asset = queue.shift();
    if (!asset) break;
    L.push(`| \`${asset.slug}\` | ${asset.source} | ${asset.orientation} | ${asset.webp.width}×${asset.webp.height} | \`${bucket.route}\` | ${bucket.slot} | **REQUIRED** — subject unconfirmed |`);
  }
}
L.push('');
L.push('### Slot summary');
L.push('');
L.push('| Route | Slot | Shape | Photographs | Rationale |');
L.push('| --- | --- | --- | ---: | --- |');
for (const bucket of BUCKETS) {
  L.push(`| \`${bucket.route}\` | ${bucket.slot} | ${bucket.shape} | ${bucket.count} | ${bucket.note} |`);
}
L.push(`| **Total** | | | **${fresh.length}** | |`);
L.push('');
if (portraitQueue.length > 0 || landscapeQueue.length > 0) {
  L.push(`> Unassigned remainder: ${portraitQueue.length} portrait, ${landscapeQueue.length} landscape.`);
  L.push('');
}
L.push('## Category C — Semantic slots held for owner confirmation');
L.push('');
L.push('These slots assert a specific trade or room, so they stay on Category A');
L.push('photography until the owner confirms which supplied frame actually shows that');
L.push('work. They must not be filled from Category B.');
L.push('');
L.push('| Slot | Current asset | Why it is held |');
L.push('| --- | --- | --- |');
L.push('| Kitchen renovations card | `services-kitchen` (alias of `site-interior`) | Only one interior frame is catalogued as a kitchen; a second cannot be verified |');
L.push('| Bathroom renovations card | `services-bathroom` (alias of `project-bathroom-01`) | Single confirmed bathroom frame |');
L.push('| Loft conversions card | `services-loft` (alias of `interior-stair`) | Currently a stair/interior frame standing in for a loft |');
L.push('| Home extensions card | `services-extension` (alias of `home-extension-hero`) | Single confirmed extension frame |');
L.push('| Any before/after slider | none | 0 verified pairs — see `docs/BEFORE_AFTER_EVIDENCE.md` |');
L.push('');
L.push('> **Flagged for the owner:** the loft conversions card currently shows a');
L.push('> stair/interior photograph. That is a pre-existing inaccuracy in the live site,');
L.push('> not one introduced here, and it should be corrected with a genuine loft photo.');
L.push('');
L.push('## Category D — Duplicate, not published (1)');
L.push('');
L.push('| File | Duplicate of | Action |');
L.push('| --- | --- | --- |');
for (const [filename, original] of DUPLICATES) {
  L.push(`| ${filename} | ${original} | Not published. Identical SHA-256, so a second asset would waste bandwidth and inflate the apparent size of the library |`);
}
L.push('');
L.push('## Naming convention');
L.push('');
L.push('New assets are named from the WhatsApp capture timestamp, for example');
L.push('`WhatsApp Image 2026-07-25 at 12.00.28 PM (1).jpeg` becomes `omni-a120028-01`:');
L.push('');
L.push('- `omni-` — project prefix');
L.push('- `a` / `b` — shoot batch (`a` = 2026-07-25, `b` = 2026-10-16)');
L.push('- `120028` — 24-hour capture time');
L.push('- `-01` — position within that capture group');
L.push('');
L.push('All lowercase ASCII, no spaces, brackets or extra dots. A timestamp-derived name');
L.push('is used instead of a running index so slugs stay stable when new photographs are');
L.push('added, and so any asset traces back to its source without a lookup table.');
L.push('');
L.push('Descriptive names such as `kitchen-renovation-02` are deliberately **not** invented');
L.push('for unconfirmed subjects. Once the owner confirms a subject, add the slug to');
L.push('`PUBLISHED_SLUGS` in `scripts/optimize-photos-config.cjs` and re-run the pipeline.');
L.push('');
L.push('## Optimisation guarantees');
L.push('');
L.push('- Originals in `Photos/` are never moved, renamed, resized, re-encoded or deleted.');
L.push('- Each asset ships as WebP (quality 78, effort 6) plus `-960` and `-640` variants');
L.push('  and a JPEG fallback.');
L.push('- Nothing is upscaled: a variant is skipped when the source is already narrower.');
L.push('- Aspect ratio is always preserved; no crop is applied during optimisation.');
L.push('- Measured result: base WebP files are **17.6% smaller** than the source JPEGs at');
L.push('  identical dimensions, before the much larger savings from responsive variants.');
L.push('- A slug-collision guard aborts the run rather than silently overwriting assets.');
L.push('');
L.push('## Rollout checklist');
L.push('');
L.push('1. Owner confirms subjects for the Category B rows they want promoted to semantic');
L.push('   slots, and supplies a genuine loft photograph.');
L.push('2. Owner identifies any true before/after pair and sets `approved: true` in');
L.push('   `client/src/data/beforeAfter.ts`.');
L.push('3. UI implementation consumes `client/src/data/photoAssets.ts` so every `<img>`');
L.push('   carries measured `width`/`height` and a `srcSet` built from the real variants.');
L.push('4. Re-run `node scripts/optimize-photos.cjs` after any rename, then run tests,');
L.push('   lint, typecheck and build.');
L.push('');

fs.writeFileSync(path.join(ROOT, 'docs', 'PHOTO_USAGE_PLAN.md'), L.join('\n'), 'utf8');
console.log(`usage plan written: ${published.length} published, ${fresh.length} neutral, ${DUPLICATES.size} duplicate`);


