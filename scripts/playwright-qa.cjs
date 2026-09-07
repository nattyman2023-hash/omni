const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const baseUrl = process.env.QA_BASE_URL || 'http://localhost:3000';
const root = path.resolve(__dirname, '..');
const screenshotRoot = path.join(root, 'qa', 'screenshots');
const reportPath = path.join(root, 'qa', 'playwright-report.json');
const suppliedPhoto = path.join(root, 'public', 'images', 'bathroom-hero.jpeg');
const pages = [
  ['home', '/'], ['services', '/services'], ['service-home-extensions', '/services/home-extensions'],
  ['service-bathroom-renovations', '/services/bathroom-renovations'], ['projects', '/projects'],
  ['project-open-plan-extension', '/projects/open-plan-extension'], ['how-it-works', '/how-it-works'],
  ['about', '/about'], ['reviews', '/reviews'], ['areas', '/areas'], ['area-manchester', '/areas/manchester'],
  ['guides', '/guides'], ['guide-planning-extension', '/guides/greater-manchester-home-extension-guide'],
  ['contact', '/contact'], ['quote', '/quote'], ['privacy', '/privacy'], ['cookies', '/cookies'],
  ['terms', '/terms'], ['staff-login', '/staff/login'], ['404-test', '/404-test'],
];
const viewports = [{ name: '390x844', width: 390, height: 844 }, { name: '768x1024', width: 768, height: 1024 }, { name: '1440x1000', width: 1440, height: 1000 }];
const failures = [];
const screenshots = [];
const accessibility = [];
const layout = [];
const interactions = {};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function navigate(page, url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await page.waitForTimeout(500);
    }
  }
  throw lastError;
}

async function captureVisuals(browser) {
  await fs.mkdir(screenshotRoot, { recursive: true });
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    for (const [name, route] of pages) {
      const errors = [];
      page.removeAllListeners('pageerror');
      page.on('pageerror', error => errors.push(error.message));
      try {
        await navigate(page, `${baseUrl}${route}`);
        await page.waitForTimeout(250);
        const filePath = path.join(screenshotRoot, `${viewport.name}-${name}.png`);
        await page.screenshot({ path: filePath, fullPage: true, timeout: 15000 });
        screenshots.push(path.relative(root, filePath));
        const metrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          h1Count: document.querySelectorAll('h1').length,
          brokenImages: [...document.images].filter(image => image.complete && image.naturalWidth === 0).length,
        }));
        layout.push({ viewport: viewport.name, route, ...metrics, overflow: metrics.scrollWidth > metrics.clientWidth + 1, pageErrors: errors });
        const axe = await new AxeBuilder({ page }).analyze();
        accessibility.push({ viewport: viewport.name, route, violations: axe.violations.map(item => ({ id: item.id, impact: item.impact, help: item.help, nodes: item.nodes.length })) });
      } catch (error) {
        failures.push({ type: 'visual', viewport: viewport.name, route, message: error.message });
      }
    }
    await context.close();
  }
}

async function runInteractions(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  try {
    await navigate(page, `${baseUrl}/`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: 'Open menu' }).click();
    // Homepage now uses the rebuilt Header (client/src/components/Header.tsx), whose mobile
    // drawer is a semantic `<nav aria-label="Mobile navigation">` rather than a `.mobile-menu`
    // CSS-class hook (that class still exists for pages still on the legacy SiteHeader).
    assert(await page.getByRole('navigation', { name: 'Mobile navigation' }).isVisible(), 'Mobile navigation did not open.');
    interactions.mobileMenu = 'passed';

    // The rebuilt Services page (client/src/pages/ServicesPage.tsx) matches the Stitch design,
    // which shows all services as a flat catalogue with no filter dropdown — the old
    // `.select-wrap select` filter control was removed by design, not broken. Exercise real
    // navigation instead: every service card links through to its own page.
    await navigate(page, `${baseUrl}/services`);
    // Exact match: the hero's "Explore Services" (plural) anchor button would also match a loose
    // /Explore Service/i pattern but only scrolls the page rather than navigating.
    await page.getByRole('link', { name: 'Explore Service', exact: true }).first().click();
    await page.waitForURL(/\/services\//);
    interactions.serviceFilter = 'passed';

    // Home Extensions and Bathroom Renovations now have bespoke pages (static FAQ cards, no
    // accordion). The collapsible accordion still lives on the generic ServiceDetailPage used by
    // the other 5 services — check it there instead.
    await navigate(page, `${baseUrl}/services/loft-conversions`);
    await page.getByRole('button', { name: /What does a loft conversions project involve/i }).click();
    assert(await page.locator('.accordion-answer').isVisible(), 'FAQ accordion did not open.');
    interactions.accordion = 'passed';

    await navigate(page, `${baseUrl}/contact`);
    await page.getByLabel('Full name').fill('Playwright Contact');
    await page.getByLabel('Email address').fill(`playwright-${Date.now()}@local.test`);
    await page.getByRole('textbox', { name: 'Telephone' }).fill('07928149731');
    await page.getByLabel('What are you planning?').fill('Testing the final local contact workflow.');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Send enquiry' }).click();
    await page.locator('.form-status.success').waitFor();
    interactions.contactSubmission = 'passed';

    let quotePosts = 0;
    page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/quote')) quotePosts += 1; });
    await navigate(page, `${baseUrl}/quote`);
    await page.getByRole('button', { name: /Continue to step 2/i }).click();
    assert(await page.locator('.form-status.error').isVisible(), 'Quote validation allowed step one without a selection.');
    await page.getByRole('button', { name: /^Home Extension/ }).click();
    await page.getByRole('button', { name: /Continue to step 2/i }).click();
    await page.getByLabel('Property type').selectOption({ label: 'Semi-detached' });
    await page.getByLabel('Project postcode').fill('M20 1AA');
    await page.getByRole('button', { name: /Continue to step 3/i }).click();
    await page.getByRole('button', { name: /^Back/ }).click();
    assert(await page.getByLabel('Property type').inputValue() === 'Semi-detached' && await page.getByLabel('Project postcode').inputValue() === 'M20 1AA', 'Quote answers were not retained when navigating backwards.');
    await page.getByRole('button', { name: /Continue to step 3/i }).click();
    await page.getByLabel('Project description').fill('A complete mobile quote wizard submission for QA.');
    await page.getByLabel('Current project stage').selectOption({ label: 'Exploring options' });
    await page.getByRole('button', { name: /Continue to step 4/i }).click();
    await page.getByRole('button', { name: /^ASAP/ }).click();
    await page.getByRole('button', { name: /Continue to step 5/i }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({ name: 'not-a-supported-file.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid upload') });
    assert((await page.locator('.form-status.error').textContent() || '').includes('Only JPG'), 'Invalid upload did not show an understandable error.');
    await fileInput.setInputFiles({ name: 'oversized-image.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc((8 * 1024 * 1024) + 1) });
    assert((await page.locator('.form-status.error').textContent() || '').includes('up to 8 MB'), 'Oversized upload did not show an understandable error.');
    await fileInput.setInputFiles(suppliedPhoto);
    assert(await page.locator('.file-list').isVisible(), 'Quote upload did not render a file row.');
    await page.getByRole('button', { name: /Remove bathroom-hero/i }).click();
    assert(await page.locator('.file-list').count() === 0, 'Quote upload removal did not work.');
    await fileInput.setInputFiles(suppliedPhoto);
    await page.getByRole('button', { name: /Continue to step 6/i }).click();
    await page.getByLabel('Full name').fill('Playwright Quote');
    await page.getByLabel('Email address').fill(`playwright-quote-${Date.now()}@local.test`);
    await page.getByRole('textbox', { name: 'Telephone' }).fill('07928149731');
    await page.getByRole('checkbox').check();
    const submit = page.getByRole('button', { name: /Submit quote request/i });
    await submit.dblclick();
    await page.waitForURL(/\/quote\/thank-you\?ref=QTE-/);
    assert(quotePosts === 1, `Double-click created ${quotePosts} quote requests.`);
    const reference = await page.locator('.reference-box strong').textContent();
    assert(/^QTE-[A-Z0-9]+$/.test(reference || ''), 'Confirmation did not show a generated quote reference.');
    const confirmationUrl = page.url();
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert(page.url() === confirmationUrl && quotePosts === 1, 'Refreshing confirmation resubmitted or changed the quote.');
    interactions.quoteWizard = { status: 'passed', quotePosts, reference };

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      interactions.staffAuth = 'not-run: local staff credentials were not configured for this run';
      return;
    }
    await navigate(page, `${baseUrl}/staff/login`);
    const unauth = await page.evaluate(async () => { const response = await fetch('/api/admin/summary'); return response.status; });
    assert(unauth === 401, `Unauthenticated staff API returned ${unauth}.`);
    await page.getByLabel('Email').fill(process.env.ADMIN_EMAIL || 'qa-admin@local.test');
    await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD || 'qa-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/staff$/);
    const auth = await page.evaluate(async () => { const response = await fetch('/api/admin/summary'); return response.status; });
    assert(auth === 200, `Authenticated staff API returned ${auth}.`);
    await page.getByRole('button', { name: /Sign out/ }).click();
    await page.waitForURL(/\/staff\/login/);
    const afterLogout = await page.evaluate(async () => { const response = await fetch('/api/admin/summary'); return response.status; });
    assert(afterLogout === 401, `Staff API remained accessible after logout (${afterLogout}).`);
    interactions.staffAuth = 'passed';
  } catch (error) {
    failures.push({ type: 'interaction', message: error.message });
  }
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await captureVisuals(browser);
    await runInteractions(browser);
  } finally {
    await browser.close();
  }
  const report = { baseUrl, screenshots, layout, accessibility, interactions, failures, generatedAt: new Date().toISOString() };
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify({ screenshots: screenshots.length, layoutChecks: layout.length, accessibilityChecks: accessibility.length, interactions, failures, report: path.relative(root, reportPath) }, null, 2));
  process.exitCode = failures.length ? 1 : 0;
})().catch(error => { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; });
