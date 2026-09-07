/** Creates design-reference/stitch/<page>/ with source-path.txt, source-hash.txt, reference.html
 *  and copies the accompanying screenshot for every unique Stitch page. Originals untouched. */
const fs = require('node:fs/promises');
const path = require('node:path');
const APP_ROOT = 'c:\\Users\\Natty\\Desktop\\Anti Grav\\Omni';
const PARENT = 'c:\\Users\\Natty\\Desktop\\Anti Grav\\Omni\\Omni Development';
const DOCS = path.join(APP_ROOT, 'docs');

const PAGE_SLUGS = {
  omni_developments_manchester_home: 'home',
  omni_developments_manchester_home_extensions: 'home-extensions',
  omni_developments_manchester_about_us: 'about',
  omni_developments_manchester_areas_we_cover: 'areas',
  omni_developments_manchester_bathroom_installation: 'bathrooms',
  omni_developments_manchester_client_reviews: 'reviews',
  omni_developments_manchester_contact_us: 'contact',
  omni_developments_manchester_guides_advice: 'guides',
  omni_developments_manchester_guide_article: 'guide-article',
  omni_developments_manchester_services: 'services',
  omni_developments_manchester_how_it_works: 'how-it-works',
  omni_developments_manchester_manchester_location_page: 'manchester-location',
  omni_developments_manchester_project_case_study: 'project-case-study',
  omni_developments_manchester_quote_confirmation: 'quote-confirmation',
  omni_developments_manchester_request_a_quote: 'request-a-quote',
  omni_developments_manchester_construction_quote_builder: 'construction-quote-builder',
  omni_developments_manchester_crm_dashboard: 'crm-dashboard',
  omni_developments_manchester_crm_login: 'crm-login',
  omni_developments_manchester_customer_quotation: 'customer-quotation',
  omni_developments_manchester_lead_pipeline: 'lead-pipeline',
  omni_developments_manchester_lead_profile: 'lead-profile',
  omni_developments_manchester_project_photos: 'project-photos',
  omni_developments_manchester_project_variations: 'project-variations',
  omni_developments_manchester_project_workspace: 'project-workspace',
  omni_developments_manchester_site_diary: 'site-diary',
  omni_developments_manchester_site_visit_inspection: 'site-visit-inspection',
  omni_developments_manchester_crm_calendar: 'crm-calendar',
  omni_developments_manchester_invoices: 'invoices',
  omni_developments_manchester_invoice_builder: 'invoice-builder',
  omni_developments_manchester_tasks: 'tasks',
};

(async () => {
  const m = JSON.parse(await fs.readFile(path.join(DOCS, 'stitch-manifest.json'), 'utf8'));
  const base = path.join(APP_ROOT, 'design-reference', 'stitch');
  await fs.mkdir(base, { recursive: true });
  const seen = new Set();
  let count = 0;
  // First pass: prefer records that have a valid page slug (named directories)
  // over loose top-level duplicates that share the same hash.
  const ordered = [...m.htmlRecords].sort((a, b) => {
    const as = PAGE_SLUGS[a.dirName] ? 0 : 1;
    const bs = PAGE_SLUGS[b.dirName] ? 0 : 1;
    return as - bs;
  });
  for (const r of ordered) {
    if (seen.has(r.sha256)) continue; // skip duplicates
    seen.add(r.sha256);
    const slug = PAGE_SLUGS[r.dirName];
    if (!slug) continue;
    const dir = path.join(base, slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'source-path.txt'), r.fullPath);
    await fs.writeFile(path.join(dir, 'source-hash.txt'), r.sha256);
    await fs.copyFile(r.fullPath, path.join(dir, 'reference.html'));
    if (r.screenshot) await fs.copyFile(r.screenshot, path.join(dir, 'screenshot.png'));
    count++;
  }
  process.stdout.write(`Created ${count} reference subfolders under design-reference/stitch/\n`);
})().catch((e) => { process.stderr.write((e.stack||e)+'\n'); process.exitCode = 1; });
