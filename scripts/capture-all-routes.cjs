/**
 * Captures full-page screenshots of every public route at the final QA
 * viewport matrix into visual-qa/current/<route>-<viewport>.png.
 * Also verifies the canonical header is present (no legacy "Ltd" branding)
 * and checks for horizontal overflow. Writes visual-qa/current/index.json.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'visual-qa', 'current');
const base = process.argv[2] || 'http://localhost:4173';
const W = 1440, H = 1000;

const ROUTES = [
  '/', '/services', '/services/home-extensions', '/services/bathroom-renovations',
  '/projects', '/projects/open-plan-extension', '/how-it-works', '/about', '/reviews',
  '/areas', '/areas/manchester', '/guides', '/guides/greater-manchester-home-extension-guide',
  '/contact', '/quote', '/privacy', '/cookies', '/terms', '/staff/login', '/404-test',
];

const VIEWPORTS = [
  { name: '1440x1000', w: 1440, h: 1000 },
  { name: '768x1024', w: 768, h: 1024 },
  { name: '390x844', w: 390, h: 844 },
];

(async () => {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.setDefaultNavigationTimeout(8000);
    page.setDefaultTimeout(8000);

    for (const route of ROUTES) {
      const slug = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '-');
      const file = `${slug}-${vp.name}.png`;
      const filePath = path.join(outDir, file);
      const errors = [];
      page.removeAllListeners('pageerror');
      page.on('pageerror', (e) => errors.push(e.message));
      try {
        await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 8000 });
      } catch (error) {
        errors.push(`Navigation failed: ${error.message}`);
      }
      await page.waitForTimeout(250);
      await page.evaluate(async () => {
        const images = [...document.images];
        for (const image of images) {
          image.loading = 'eager';
          image.scrollIntoView({ block: 'center', inline: 'nearest' });
          await new Promise((resolve) => setTimeout(resolve, 60));
        }
        await Promise.all(images.map((image) => Promise.race([
          image.decode().catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 1200)),
        ])));
        await Promise.all(images.map((image) => image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
            const finish = () => resolve();
            image.addEventListener('load', finish, { once: true });
            image.addEventListener('error', finish, { once: true });
            setTimeout(finish, 4000);
          })));
        window.scrollTo(0, 0);
      });
      // Chromium can finish decoding lazy images just after scroll restoration;
      // allow the compositor to paint them before taking a full-page capture.
      await page.waitForTimeout(1000);
      try {
        await page.screenshot({ path: filePath, fullPage: true, timeout: 10000 });
      } catch (error) {
        errors.push(`Screenshot failed: ${error.message}`);
      }
      const check = await page.evaluate(() => {
        const headerText = document.querySelector('header') ? document.querySelector('header').innerText.slice(0, 300) : '';
        const hasLegacy = headerText.includes('Developments Ltd') || headerText.includes('Design & Build Specialists');
        const hasCanonical = headerText.includes('Manchester Ltd') || headerText.includes('Design & Build');
        const h1 = document.querySelector('h1') ? document.querySelector('h1').innerText.trim().slice(0, 80) : '';
        const sectionCount = document.querySelectorAll('section').length;
        return {
          headerText: headerText.replace(/\n/g, ' | ').slice(0, 200),
          hasLegacyHeader: hasLegacy,
          hasCanonicalHeader: hasCanonical,
          h1, sectionCount,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          pageHeight: document.documentElement.scrollHeight,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        };
      });
      results.push({ route, viewport: vp.name, file, ...check, errors });
    }
    await ctx.close();
  }

  await browser.close();
  await fs.writeFile(path.join(outDir, 'index.json'), JSON.stringify(results, null, 2));

  // Summary
  let legacyCount = 0, overflowCount = 0;
  process.stdout.write(`\n=== FULL PAGE SCREENSHOT AUDIT (${results.length} captures) ===\n`);
  for (const r of results) {
    if (r.hasLegacyHeader) legacyCount++;
    if (r.overflow) overflowCount++;
    const flag = r.hasLegacyHeader ? ' LEGACY-HEADER' : '';
    const ovf = r.overflow ? ' OVERFLOW' : '';
    process.stdout.write(`  ${r.viewport} ${r.route.padEnd(45)} sections=${r.sectionCount} h="${r.h1.slice(0, 40)}"${flag}${ovf}\n`);
  }
  process.stdout.write(`\nLegacy headers: ${legacyCount} | Overflow defects: ${overflowCount}\n`);
  process.stdout.write(`Screenshots: ${outDir}\\*.png\nIndex: visual-qa/current/index.json\n`);
})().catch((e) => { process.stderr.write((e.stack || e) + '\n'); process.exitCode = 1; });
