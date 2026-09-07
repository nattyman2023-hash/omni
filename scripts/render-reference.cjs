/**
 * Reference renderer (Batch 1, step 1-4 of the Stitch visual reset).
 *
 * 1. Copies the canonical Stitch `code.html` files into visual-reference/
 *    using the task's source-file naming (code(10).html, code(3).html, ...).
 *    The originals under "Omni Development/" are never modified.
 * 2. Renders each copied HTML file unchanged in headless Chromium at
 *    1440 x 1000, device scale factor 1, full-page screenshot.
 * 3. Saves visual-reference/<page>-reference.png for every route.
 *
 * The Stitch HTML loads Tailwind + Google Fonts from CDNs. If those
 * remote stylesheets fail to load we keep the DOM/boxes intact (no
 * redesign) and still capture the screenshot so the layout baseline is
 * recorded. Remote architectural image URLs that 404 are left in place;
 * their containers keep their aspect ratios.
 */
const fs = require('node:fs/promises');
const fssync = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const stitchRoot = path.join(
  root,
  'Omni Development',
  'stitch_omni_developments_digital_platform',
  'stitch_omni_developments_digital_platform',
);
const outDir = path.join(root, 'visual-reference');

// source directory -> task source-file name -> reference screenshot name
const PAGES = [
  { dir: 'omni_developments_manchester_home', source: 'code(10).html', ref: 'home-reference.png' },
  { dir: 'omni_developments_manchester_home_extensions', source: 'code(20260904-151016).html', ref: 'extensions-reference.png' },
  { dir: 'omni_developments_manchester_about_us', source: 'code(3).html', ref: 'about-reference.png' },
  { dir: 'omni_developments_manchester_areas_we_cover', source: 'code(4).html', ref: 'areas-reference.png' },
  { dir: 'omni_developments_manchester_bathroom_installation', source: 'code(5).html', ref: 'bathroom-reference.png' },
  { dir: 'omni_developments_manchester_client_reviews', source: 'code(6).html', ref: 'reviews-reference.png' },
  { dir: 'omni_developments_manchester_contact_us', source: 'code(7).html', ref: 'contact-reference.png' },
  { dir: 'omni_developments_manchester_guides_advice', source: 'code(9).html', ref: 'guides-reference.png' },
  { dir: 'omni_developments_manchester_guide_article', source: 'code(8).html', ref: 'guide-article-reference.png' },
];

const WIDTH = 1440;
const HEIGHT = 1000;

async function copyReferences() {
  await fs.mkdir(outDir, { recursive: true });
  const copied = [];
  for (const page of PAGES) {
    const src = path.join(stitchRoot, page.dir, 'code.html');
    const dst = path.join(outDir, page.source);
    if (!fssync.existsSync(src)) {
      throw new Error(`Canonical source missing: ${src}`);
    }
    await fs.copyFile(src, dst);
    copied.push(page.source);
  }
  return copied;
}

async function renderAll() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const results = [];
  for (const p of PAGES) {
    const htmlPath = path.join(outDir, p.source);
    const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
    const failures = [];
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    page.on('pageerror', (err) => failures.push(`pageerror: ${err.message}`));
    page.on('requestfailed', (req) => {
      const url = req.url();
      // Only surface stylesheet/script failures; broken images are expected
      // and must not block the reference capture.
      if (/\.(css|js)(\?|$)/.test(url) || /cdn\.tailwindcss\.com/.test(url) || /fonts\.googleapis/.test(url)) {
        failures.push(`requestfailed: ${url} - ${req.failure()?.errorText}`);
      }
    });
    try {
      await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (err) {
      // networkidle can time out on slow CDNs; fall back to load + settle.
      try {
        await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 });
      } catch (err2) {
        failures.push(`goto: ${err2.message}`);
      }
    }
    // Let Tailwind CDN + fonts apply, and let any inline scripts run.
    await page.waitForTimeout(1500);
    const outPath = path.join(outDir, p.ref);
    await page.screenshot({ path: outPath, fullPage: true });
    const stats = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyHeight: document.documentElement.scrollHeight,
      h1: document.querySelectorAll('h1').length,
      sections: document.querySelectorAll('main > section').length,
      images: document.images.length,
      brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
    }));
    results.push({
      source: p.source,
      ref: p.ref,
      sections: stats.sections,
      h1: stats.h1,
      images: stats.images,
      brokenImages: stats.brokenImages,
      pageHeight: stats.bodyHeight,
      overflow: stats.scrollWidth > stats.clientWidth + 1,
      failures,
    });
  }
  await browser.close();
  return results;
}

(async () => {
  const copied = await copyReferences();
  process.stdout.write(`Copied ${copied.length} canonical sources into visual-reference/\n`);
  const results = await renderAll();
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
})().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exitCode = 1;
});
