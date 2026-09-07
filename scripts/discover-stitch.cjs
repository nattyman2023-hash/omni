/**
 * Complete recursive Stitch discovery across ALL sibling folders under
 * "Omni Development". Finds every HTML, screenshot, image, DESIGN.md;
 * computes SHA-256; extracts H1/H2; identifies duplicates by hash; maps
 * each unique page to an expected route; writes docs/stitch-manifest.json.
 * Read-only: never modifies any original file.
 */
const fs = require('node:fs/promises');
const fssync = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { JSDOM } = require('jsdom');

const PARENT = 'c:\\Users\\Natty\\Desktop\\Anti Grav\\Omni\\Omni Development';
const APP_ROOT = 'c:\\Users\\Natty\\Desktop\\Anti Grav\\Omni';
const DOCS = path.join(APP_ROOT, 'docs');

const H1_TO_ROUTE = {
  'Transforming Homes Across Greater Manchester': '/',
  'Home Extensions in Manchester & Cheshire': '/services/home-extensions',
  'Built Around Quality, Communication and Craftsmanship': '/about',
  'Serving Greater Manchester & Cheshire': '/areas',
  'Bathroom Renovations & Installations in Manchester & Cheshire': '/services/bathroom-renovations',
  'What Our Clients Say': '/reviews',
  'Planning Your Next Home Project?': '/guides',
  'The Complete Greater Manchester Home Extension Guide: Costs, Planning & Timelines': '/guides/greater-manchester-home-extension-guide',
};

const DIR_TO_PAGE = {
  omni_developments_manchester_home: 'Homepage',
  omni_developments_manchester_home_extensions: 'Home Extensions',
  omni_developments_manchester_about_us: 'About',
  omni_developments_manchester_areas_we_cover: 'Areas Covered',
  omni_developments_manchester_bathroom_installation: 'Bathroom Renovations',
  omni_developments_manchester_client_reviews: 'Reviews',
  omni_developments_manchester_contact_us: 'Contact',
  omni_developments_manchester_guides_advice: 'Guides Hub',
  omni_developments_manchester_guide_article: 'Guide Article',
  omni_developments_manchester_services: 'Services Listing',
  omni_developments_manchester_how_it_works: 'How It Works',
  omni_developments_manchester_project_case_study: 'Project Case Study',
  omni_developments_manchester_manchester_location_page: 'Manchester Location',
  omni_developments_manchester_quote_confirmation: 'Quote Confirmation',
  omni_developments_manchester_request_a_quote: 'Request a Quote',
  omni_developments_manchester_construction_quote_builder: 'Construction Quote Builder',
  omni_developments_manchester_crm_dashboard: 'CRM Dashboard',
  omni_developments_manchester_crm_login: 'CRM Login',
  omni_developments_manchester_customer_quotation: 'Customer Quotation',
  omni_developments_manchester_lead_pipeline: 'Lead Pipeline',
  omni_developments_manchester_lead_profile: 'Lead Profile',
  omni_developments_manchester_project_photos: 'Project Photos',
  omni_developments_manchester_project_variations: 'Project Variations',
  omni_developments_manchester_project_workspace: 'Project Workspace',
  omni_developments_manchester_site_diary: 'Site Diary',
  omni_developments_manchester_site_visit_inspection: 'Site Visit Inspection',
  omni_developments_manchester_tasks: 'Tasks',
  omni_developments_manchester_invoices: 'Invoices',
  omni_developments_manchester_invoice_builder: 'Invoice Builder',
  omni_developments_manchester_crm_calendar: 'CRM Calendar',
};

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

async function walk(dir, out = []) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

function extractHeadings(html) {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const d = dom.window.document;
  const h1 = d.querySelector('h1') ? (d.querySelector('h1').textContent || '').trim() : null;
  const h2s = [...d.querySelectorAll('h2')].map((el) => (el.textContent || '').trim()).filter(Boolean);
  const title = d.querySelector('title') ? (d.querySelector('title').textContent || '').trim() : null;
  return { h1, h2s, title };
}

(async () => {
  await fs.mkdir(DOCS, { recursive: true });
  const folders = (await fs.readdir(PARENT, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && e.name.startsWith('stitch_'))
    .map((e) => path.join(PARENT, e.name));

  const allFiles = [];
  for (const f of folders) await walk(f, allFiles);

  const htmlFiles = allFiles.filter((f) => f.toLowerCase().endsWith('.html'));
  const pngFiles = allFiles.filter((f) => f.toLowerCase().endsWith('.png'));
  const jpgFiles = allFiles.filter((f) => /\.(jpg|jpeg)$/i.test(f));
  const webpFiles = allFiles.filter((f) => f.toLowerCase().endsWith('.webp'));
  const svgFiles = allFiles.filter((f) => f.toLowerCase().endsWith('.svg'));
  const designFiles = allFiles.filter((f) => path.basename(f).toLowerCase() === 'design.md');

  const htmlRecords = [];
  for (const htmlPath of htmlFiles) {
    const buf = await fs.readFile(htmlPath);
    const stat = await fs.stat(htmlPath);
    const hash = sha256(buf);
    const { h1, h2s, title } = extractHeadings(buf.toString('utf8'));
    const dir = path.dirname(htmlPath);
    const dirName = path.basename(dir);
    const fileName = path.basename(htmlPath);
    const screenshot = pngFiles.find((p) => path.dirname(p) === dir && path.basename(p).toLowerCase().startsWith('screen'));
    const design = designFiles.find((p) => p.startsWith(dir) || dir.startsWith(path.dirname(p)));
    const pageLabel = DIR_TO_PAGE[dirName] || null;
    const route = h1 ? (H1_TO_ROUTE[h1] || H1_TO_ROUTE[(h1 || '').replace(/[\u2019]/g, "'")]) : null;
    htmlRecords.push({ fullPath: htmlPath, relativePath: path.relative(PARENT, htmlPath), fileName, dirName, sizeBytes: stat.size, sha256: hash, h1, h2s, title, screenshot, designMd: design, pageLabel, route });
  }

  const byHash = {};
  for (const r of htmlRecords) (byHash[r.sha256] ||= []).push(r);
  for (const r of htmlRecords) { r.duplicate = byHash[r.sha256].length > 1; r.duplicateGroup = byHash[r.sha256].map((x) => x.relativePath); }
  const uniqueHashes = Object.keys(byHash);
  const uniqueRecords = uniqueHashes.map((h) => byHash[h][0]);

  const appFiles = []; await walk(APP_ROOT, appFiles);
  const appPackageJsons = appFiles.filter((f) => path.basename(f) === 'package.json' && !f.includes('node_modules'));
  const appViteConfigs = appFiles.filter((f) => /vite\.config\./i.test(path.basename(f)) && !f.includes('node_modules'));
  const appTailwindConfigs = appFiles.filter((f) => /tailwind\.config\./i.test(path.basename(f)) && !f.includes('node_modules'));

  const manifest = {
    generatedAt: new Date().toISOString(),
    workspaceRoot: PARENT, applicationRoot: APP_ROOT, stitchFolders: folders,
    counts: {
      stitchFolders: folders.length, totalFilesUnderStitch: allFiles.length,
      htmlFiles: htmlFiles.length, pngScreenshots: pngFiles.length, jpgImages: jpgFiles.length,
      webpImages: webpFiles.length, svgImages: svgFiles.length, designMdFiles: designFiles.length,
      uniqueHtmlDesigns: uniqueHashes.length, duplicateHtmlFiles: htmlRecords.filter((r) => r.duplicate).length,
      appPackageJsons: appPackageJsons.length, appViteConfigs: appViteConfigs.length, appTailwindConfigs: appTailwindConfigs.length,
    },
    applicationInfo: { packageJsons: appPackageJsons, viteConfigs: appViteConfigs, tailwindConfigs: appTailwindConfigs },
    htmlRecords,
    uniqueRecords: uniqueRecords.map((r) => ({ path: r.relativePath, h1: r.h1, route: r.route, pageLabel: r.pageLabel, sha256: r.sha256.slice(0, 12) })),
    imageInventory: { png: pngFiles, jpg: jpgFiles, webp: webpFiles, svg: svgFiles },
    designMdFiles: designFiles,
  };
  await fs.writeFile(path.join(DOCS, 'stitch-manifest.json'), JSON.stringify(manifest, null, 2));

  const c = manifest.counts;
  process.stdout.write(`\n=== STITCH DISCOVERY SUMMARY ===\n`);
  process.stdout.write(`Workspace root: ${PARENT}\nApplication root: ${APP_ROOT}\n`);
  process.stdout.write(`Stitch folders: ${c.stitchFolders}\n`);
  for (const f of folders) process.stdout.write(`  - ${path.relative(PARENT, f)}\n`);
  process.stdout.write(`HTML: ${c.htmlFiles} | unique: ${c.uniqueHtmlDesigns} | duplicates: ${c.duplicateHtmlFiles}\n`);
  process.stdout.write(`PNG: ${c.pngScreenshots} | JPG: ${c.jpgImages} | WEBP: ${c.webpImages} | SVG: ${c.svgImages} | DESIGN.md: ${c.designMdFiles}\n`);
  process.stdout.write(`\n--- UNIQUE HTML DESIGNS (${uniqueRecords.length}) ---\n`);
  for (const r of uniqueRecords) {
    process.stdout.write(`  [${r.duplicate ? 'DUP' : 'UNI'}] ${r.relativePath}\n`);
    process.stdout.write(`       H1: "${r.h1}" | Route: ${r.route || '(unmapped)'} | Page: ${r.pageLabel || '?'} | SHA: ${r.sha256.slice(0, 12)}\n`);
    if (r.duplicate) process.stdout.write(`       Dups: ${r.duplicateGroup.filter((x) => x !== r.relativePath).join(', ')}\n`);
  }
  process.stdout.write(`\nManifest: docs/stitch-manifest.json\n`);
})().catch((e) => { process.stderr.write((e.stack || e) + '\n'); process.exitCode = 1; });

