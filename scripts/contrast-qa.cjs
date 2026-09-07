const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto('http://localhost:3000/services/bathroom-renovations', { waitUntil: 'networkidle' });
  const result = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  process.stdout.write(`${JSON.stringify(result.violations, null, 2)}\n`);
  await context.close();
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
