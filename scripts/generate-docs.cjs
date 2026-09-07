/** Generates STITCH_SOURCE_MANIFEST.md + ROUTE_PARITY_MATRIX.md from manifest JSON + routes data. */
const fs = require('node:fs/promises');
const path = require('node:path');
const APP_ROOT = 'c:\\Users\\Natty\\Desktop\\Anti Grav\\Omni';
const DOCS = path.join(APP_ROOT, 'docs');
const PARENT = 'c:\\Users\\Natty\\Desktop\\Anti Grav\\Omni\\Omni Development';

(async () => {
  const m = JSON.parse(await fs.readFile(path.join(DOCS, 'stitch-manifest.json'), 'utf8'));
  const ROUTES = JSON.parse(await fs.readFile(path.join(__dirname, 'routes-data.json'), 'utf8'));
  const recs = m.htmlRecords;

  // ===== STITCH_SOURCE_MANIFEST.md =====
  let md = `# Stitch Source Manifest\n\nGenerated: ${m.generatedAt}\n\n## Workspace\n\n- **Workspace root:** ${m.workspaceRoot}\n- **Application root:** ${m.applicationRoot}\n- **Stitch folders discovered:** ${m.counts.stitchFolders}\n`;
  for (const f of m.stitchFolders) md += `  - \`${f}\`\n`;
  md += `\n## Inventory counts\n\n| Item | Count |\n|------|-------|\n`;
  for (const [k, v] of Object.entries(m.counts)) md += `| ${k} | ${v} |\n`;
  md += `\n## Application identification\n\nThe actual React/Vite + Express application is at \`${m.applicationRoot}\`.\n\n| Artifact | Path |\n|----------|------|\n`;
  for (const p of m.applicationInfo.packageJsons) md += `| package.json | \`${p}\` |\n`;
  for (const p of m.applicationInfo.viteConfigs) md += `| vite config | \`${p}\` |\n`;
  for (const p of m.applicationInfo.tailwindConfigs) md += `| tailwind config | \`${p}\` |\n`;
  md += `\n## Full HTML manifest\n\n| # | Full source path | SHA-256 (12) | H1 | Page | Route | Screenshot | Dup? | Size | Status |\n|---|---|---|---|---|---|---|---|---|---|\n`;
  recs.forEach((r, i) => {
    const rt = ROUTES.find((x) => x.stitchDir === r.dirName);
    const status = rt ? rt.status : '—';
    const route = r.route || (r.pageLabel === 'Contact' ? '/contact' : '—');
    md += `| ${i+1} | \`${r.relativePath}\` | ${r.sha256.slice(0,12)} | ${(r.h1||'(none)').replace(/\|/g,'\\|').slice(0,55)} | ${r.pageLabel||'—'} | ${route} | ${r.screenshot?'Yes':'No'} | ${r.duplicate?'Dup':'Uni'} | ${r.sizeBytes} | ${status} |\n`;
  });
  md += `\n## Duplicate groups (verified by SHA-256)\n\n`;
  const seen = new Set();
  for (const r of recs.filter((x) => x.duplicate)) {
    if (seen.has(r.sha256)) continue; seen.add(r.sha256);
    md += `**SHA ${r.sha256.slice(0,12)}** — H1: "${r.h1}"\n`;
    for (const p of r.duplicateGroup) md += `  - \`${p}\`\n`;
    md += `\n`;
  }
  md += `## DESIGN.md files\n\n`;
  for (const d of m.designMdFiles) md += `- \`${d}\`\n`;
  await fs.writeFile(path.join(DOCS, 'STITCH_SOURCE_MANIFEST.md'), md);

  // ===== ROUTE_PARITY_MATRIX.md =====
  let rm = `# Route Parity Matrix\n\nGenerated: ${m.generatedAt}\n\nRouter: \`client/src/App.tsx\` line 296. Layouts: **RebuiltLayout** (Stitch-matched Header/Footer + Tailwind) vs **Layout** (legacy generic).\n\n## Status definitions\n\n- **MATCHED** — faithfully translated from Stitch HTML\n- **PARTIAL** — some Stitch sections exist but incomplete or content was sanitised\n- **STALE** — route exists but displays earlier generic design\n- **MISSING** — route/component does not exist\n- **NO STITCH REFERENCE** — no matching HTML found\n\n## Route → Component → Stitch source\n\n| Route | Stitch ref | Component | Source | Layout | Stitch file | Status | Missing work |\n|---|:-:|---|---|---|---|---|---|\n`;
  for (const r of ROUTES) {
    const sp = r.stitchDir ? recs.find((x) => x.dirName === r.stitchDir)?.relativePath || '—' : '—';
    rm += `| \`${r.route}\` | ${r.stitchDir?'Yes':'No'} | ${r.component} | \`${r.source}\` | ${r.layout} | ${sp!=='—'?'\`'+sp+'\`':'—'} | ${r.status} | ${r.notes} |\n`;
  }
  const counts = {};
  for (const r of ROUTES) counts[r.status] = (counts[r.status]||0)+1;
  rm += `\n## Summary\n\n| Status | Count |\n|---|---|\n`;
  for (const [k,v] of Object.entries(counts)) rm += `| ${k} | ${v} |\n`;
  rm += `\n**Total routes:** ${ROUTES.length} | **With Stitch ref:** ${ROUTES.filter(r=>r.stitchDir).length} | **MATCHED:** ${counts['MATCHED']||0} | **PARTIAL:** ${counts['PARTIAL']||0} | **STALE:** ${counts['STALE']||0} | **NO STITCH REF:** ${counts['NO STITCH REFERENCE']||0} | **MISSING:** ${counts['MISSING']||0}\n\n## Critical issues\n\n1. **Guide article slug mismatch**: Route \`/guides/:slug\` but Stitch H1 maps to \`/guides/greater-manchester-home-extension-guide\`. Current slug is \`planning-your-home-extension\`.\n2. **Reviews, Guides, Guide Detail, Contact** are inline generic templates in \`App.tsx\` using legacy \`Layout\` — have dedicated Stitch HTML.\n3. **Quote + Quote Confirmation** are inline generic — Stitch \`request_a_quote\` + \`quote_confirmation\` exist.\n4. **PARTIAL pages** (About, Areas, Bathrooms, Services, How It Works, Project Case Study) were rebuilt with sanitised content — need verbatim Stitch copy restored.\n5. **Staff/CRM routes** all use one generic \`AdminPage\` — 10 unique Stitch CRM designs exist.\n`;
  await fs.writeFile(path.join(DOCS, 'ROUTE_PARITY_MATRIX.md'), rm);
  process.stdout.write('Written: docs/STITCH_SOURCE_MANIFEST.md + docs/ROUTE_PARITY_MATRIX.md\n');
})().catch((e) => { process.stderr.write((e.stack||e)+'\n'); process.exitCode = 1; });
