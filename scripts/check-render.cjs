const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'qa/debug-home.png', fullPage: true, timeout: 10000 });
  process.stdout.write(JSON.stringify({
    status: response?.status(),
    title: await page.title(),
    text: (await page.locator('body').innerText()).slice(0, 400),
    root: (await page.locator('#root').innerHTML()).slice(0, 400),
    errors,
  }, null, 2));
  await browser.close();
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
