// Verifies the generated photo documentation is internally consistent and
// honest. Exits non-zero on any failure so it can gate CI / pre-deploy checks.
const { assetData, DUPLICATES, fs, path, ROOT } = require('./photo-lib.cjs');

const failures = [];
const notes = [];

function check(label, condition, detail) {
  if (condition) {
    notes.push(`PASS  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures.push(`FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const planPath = path.join(ROOT, 'docs', 'PHOTO_USAGE_PLAN.md');
const manifestPath = path.join(ROOT, 'docs', 'PHOTOGRAPH_ASSET_MANIFEST.md');
const evidencePath = path.join(ROOT, 'docs', 'BEFORE_AFTER_EVIDENCE.md');

for (const file of [planPath, manifestPath, evidencePath]) {
  check(`exists: ${path.relative(ROOT, file)}`, fs.existsSync(file));
}
if (failures.length > 0) {
  console.log(notes.join('\n'));
  console.log(failures.join('\n'));
  process.exit(1);
}

const plan = fs.readFileSync(planPath, 'utf8');
const assets = assetData.assets;
const published = assets.filter((a) => a.alreadyPublished);
const fresh = assets.filter((a) => !a.alreadyPublished);

// ── Counts ──
check('unique assets = published + newly optimised', published.length + fresh.length === assets.length,
  `${published.length} + ${fresh.length} = ${assets.length}`);
check('published count is 14', published.length === 14, `${published.length}`);
check('newly optimised count is 56', fresh.length === 56, `${fresh.length}`);
check('duplicate count is 1', DUPLICATES.size === 1, `${DUPLICATES.size}`);
check('plan states the counts', /14 published, 56 neutral, 1 duplicate/.test(plan)
  || plan.includes('**70 unique supplied photographs**'));

// ── No unresolved route placeholders left behind ──
check('no "See PHOTO_MAPPING.md" fallbacks remain', !plan.includes('See PHOTO_MAPPING.md'));

// ── Category A: every published asset appears exactly once ──
const catA = plan.split('## Category A')[1].split('## Category B')[0];
const catASlugs = [...catA.matchAll(/^\| `(omni-[\w-]+|[a-z][\w-]*)` \|/gm)].map((m) => m[1]);
const publishedSlugs = published.map((a) => a.slug);
check('Category A lists every published asset once',
  publishedSlugs.every((slug) => catASlugs.filter((s) => s === slug).length === 1)
  && catASlugs.length === publishedSlugs.length,
  `${catASlugs.length} rows for ${publishedSlugs.length} assets`);

// ── Category B: every newly optimised asset is assigned exactly once ──
const catB = plan.split('## Category B')[1].split('\n## ')[0];
const catBSlugs = [...catB.matchAll(/^\| `(omni-[\w-]+)` \|/gm)].map((m) => m[1]);
const freshSlugs = fresh.map((a) => a.slug);
const missing = freshSlugs.filter((slug) => !catBSlugs.includes(slug));
const dupes = catBSlugs.filter((slug, i) => catBSlugs.indexOf(slug) !== i);
check('Category B assigns all 56 newly optimised assets', missing.length === 0,
  missing.length > 0 ? `missing: ${missing.join(', ')}` : `${catBSlugs.length} rows`);
check('no asset is assigned to two slots', dupes.length === 0,
  dupes.length > 0 ? `duplicated: ${dupes.join(', ')}` : 'clean');
check('Category B contains no published asset',
  catBSlugs.every((slug) => !publishedSlugs.includes(slug)));
check('no newly optimised asset is duplicated into Category A',
  catASlugs.every((slug) => !freshSlugs.includes(slug)));

// ── Honesty: no unconfirmed photo may carry a trade label ──
const FORBIDDEN_LABELS = ['kitchen', 'bathroom', 'loft', 'extension', 'renovation', 'driveway', 'garden'];
const catBBody = catB.split('\n').filter((l) => /^\| `omni-/.test(l));
const labelled = catBBody.filter((line) => {
  const cells = line.split('|').map((c) => c.trim());
  // Slot + route cells only; the source filename is a fact, not a claim.
  const claim = [cells[5], cells[6], cells[7]].join(' ').toLowerCase();
  return FORBIDDEN_LABELS.some((word) => claim.includes(word));
});
check('no unconfirmed photo is given a trade label', labelled.length === 0,
  labelled.length > 0 ? `${labelled.length} rows assert a trade` : 'all slots neutral');

// ── Owner confirmation required on every Category B row ──
const unconfirmed = catBBody.filter((line) => !/REQUIRED/i.test(line));
check('every Category B row demands owner confirmation', unconfirmed.length === 0,
  unconfirmed.length > 0 ? `${unconfirmed.length} rows silent` : 'all marked REQUIRED');

// ── Orientation honesty: portrait assets must not be planned into wide slots ──
const orientationBySlug = new Map(assets.map((a) => [a.slug, a.orientation]));
const wideSlotRows = catBBody.filter((line) => /wide|hero/i.test(line));
const portraitInWide = wideSlotRows.filter((line) => {
  const slug = /^\| `(omni-[\w-]+)`/.exec(line)[1];
  return orientationBySlug.get(slug) === 'portrait';
});
check('no portrait asset is planned into a wide/hero slot', portraitInWide.length === 0,
  portraitInWide.length > 0 ? `${portraitInWide.length} mismatched` : 'clean');

// ── Duplicates must not be published as their own asset ──
const assetJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', '_photo_assets.json'), 'utf8'));
const publishedSources = new Set(assetJson.assets.map((a) => a.source));
const publishedSlugSet = new Set(assetJson.assets.map((a) => a.slug));
check('asset data carries no duplicate entries',
  publishedSlugSet.size === assetJson.assets.length, `${assetJson.assets.length} assets`);
for (const [filename, duplicateOf] of DUPLICATES.entries()) {
  check(`duplicate not published as its own asset: ${filename}`, !publishedSources.has(filename));
  check(`the original it duplicates IS represented: ${duplicateOf}`, publishedSources.has(duplicateOf));
}

// ── Every path the frontend will request must exist on disk ──
const imagesDir = path.join(ROOT, 'public', 'images');
const missingFiles = [];
for (const asset of assetJson.assets) {
  const expected = [
    asset.webp.file,
    asset.jpeg.file,
    ...asset.variants.map((v) => v.file),
  ];
  for (const file of expected) {
    if (!fs.existsSync(path.join(imagesDir, file))) missingFiles.push(file);
  }
}
check('every generated asset path exists in public/images', missingFiles.length === 0,
  missingFiles.length > 0 ? `${missingFiles.length} missing, e.g. ${missingFiles.slice(0, 3).join(', ')}`
    : `${assetJson.assets.length * 4} files verified`);

// ── The TypeScript mirror must agree with the JSON source of truth ──
const tsSource = fs.readFileSync(path.join(ROOT, 'client', 'src', 'data', 'photoAssets.ts'), 'utf8');
const tsSlugs = [...tsSource.matchAll(/^\s{4}slug: "([^"]+)",$/gm)].map((m) => m[1]);
check('photoAssets.ts lists the same assets as _photo_assets.json',
  tsSlugs.length === assetJson.assets.length
  && tsSlugs.every((slug, i) => slug === assetJson.assets[i].slug),
  `${tsSlugs.length} in TS vs ${assetJson.assets.length} in JSON`);
check('photoAssets.ts exposes the responsive helpers',
  ['photoWebpSrcSet', 'photoJpegSrcSet', 'photoAspectRatio', 'photoVariantPath', 'photo(']
    .every((name) => tsSource.includes(`export function ${name}`)));

// ── Before/after gating: nothing may be publishable ──
const evidence = fs.readFileSync(evidencePath, 'utf8');
check('evidence states 0 verified pairs', /\*\*0 VERIFIED pairs\./.test(evidence));
check('evidence states 0 pairs approved for public slider use',
  /0 pairs approved for public slider use/.test(evidence));
check('evidence records no HIGH-confidence pair', /0 HIGH-confidence pairs\./.test(evidence));

// ── The shipped gate must exist and must match the evidence report ──
// The evidence report promises a data file and a gated component. Both are
// verified here so that promise cannot quietly become false.
const baDataPath = path.join(ROOT, 'client', 'src', 'data', 'beforeAfter.ts');
const baComponentPath = path.join(ROOT, 'client', 'src', 'components', 'BeforeAfterComparison.tsx');
check('client/src/data/beforeAfter.ts exists', fs.existsSync(baDataPath));
check('BeforeAfterComparison component exists', fs.existsSync(baComponentPath));

const docCandidates = evidence.split('\n')
  .filter((line) => line.startsWith('| BA-'))
  .map((line) => line.split('|').map((col) => col.trim()))
  .map((cols) => ({ id: cols[1], confidence: cols[5], approved: cols[6] }));

const baSource = fs.existsSync(baDataPath) ? fs.readFileSync(baDataPath, 'utf8') : '';
const dataPairs = [...baSource.matchAll(/id: '(BA-\d+)'[\s\S]*?confidence: '([^']+)',\s*\n\s*approved: (true|false)/g)]
  .map((m) => ({ id: m[1], confidence: m[2], approved: m[3] === 'true' }));

check('beforeAfter.ts lists the same candidates as the evidence report',
  dataPairs.length === docCandidates.length
  && dataPairs.every((pair, i) => pair.id === docCandidates[i].id && pair.confidence === docCandidates[i].confidence),
  `${dataPairs.length} in data vs ${docCandidates.length} in report`);
check('every shipped before/after pair is unapproved',
  dataPairs.length > 0 && dataPairs.every((pair) => !pair.approved),
  dataPairs.filter((pair) => pair.approved).map((pair) => pair.id).join(', ') || 'none approved');
check('the evidence report never claims an approval',
  docCandidates.length > 0 && docCandidates.every((row) => row.approved === '**NO**'));

const baComponent = fs.existsSync(baComponentPath) ? fs.readFileSync(baComponentPath, 'utf8') : '';
check('BeforeAfterComparison renders only through the approval gate',
  baComponent.includes('canRenderBeforeAfter(pair)') && /if \(!canRenderBeforeAfter\(pair\)\) return null;/.test(baComponent));
check('BeforeAfterComparison sets explicit dimensions to avoid layout shift',
  baComponent.includes('photoAspectRatio') && baComponent.includes('width={asset.width}') && baComponent.includes('height={asset.height}'));
check('BeforeAfterComparison builds srcSet from the real generated variants',
  baComponent.includes('photoWebpSrcSet'));

console.log(notes.join('\n'));
if (failures.length > 0) {
  console.log('\n' + failures.join('\n'));
  console.log(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${notes.length} checks passed.`);
