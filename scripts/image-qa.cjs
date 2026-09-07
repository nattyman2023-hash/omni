const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const baseUrl = process.env.QA_BASE_URL || 'http://localhost:3000';
const reportPath = path.join(root, 'qa', 'image-report.json');
const routes = [
  '/', '/services', '/services/home-extensions', '/services/bathroom-renovations',
  '/projects', '/projects/open-plan-extension', '/how-it-works', '/about', '/reviews',
  '/areas', '/areas/manchester', '/guides', '/guides/greater-manchester-home-extension-guide',
  '/contact', '/quote', '/privacy', '/cookies', '/terms', '/staff/login', '/404-test',
];

function isRemote(url) {
  return /^https?:\/\//i.test(url) && !url.startsWith(baseUrl);
}

function sourceComponent(element) {
  return element.getAttribute('data-source-component')
    || element.closest('[data-source-component]')?.getAttribute('data-source-component')
    || element.closest('section')?.querySelector('[data-source-component]')?.getAttribute('data-source-component')
    || 'unknown';
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const route of routes) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const failedRequests = [];
      const imageResponses = [];
      page.on('requestfailed', (request) => {
        if (request.resourceType() === 'image') failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'request failed' });
      });
      page.on('response', (response) => {
        if (response.request().resourceType() === 'image' && (response.status() < 200 || response.status() >= 300)) {
          imageResponses.push({ url: response.url(), status: response.status() });
        }
      });

      let navigationStatus = null;
      let navigationError = null;
      try {
        const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        navigationStatus = response?.status() ?? null;
      } catch (error) {
        navigationError = error.message;
      }
      await page.waitForTimeout(500);
      await page.evaluate(async () => {
        const images = [...document.images];
        for (const image of images) {
          image.loading = 'eager';
          image.scrollIntoView({ block: 'center', inline: 'nearest' });
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
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
      await page.waitForTimeout(500);

      const pageImages = await page.evaluate(() => [...document.images].map((image) => ({
        element: image.tagName.toLowerCase(),
        requestedUrl: image.currentSrc || image.src,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        complete: image.complete,
        visible: Boolean(image.getClientRects().length && getComputedStyle(image).display !== 'none' && getComputedStyle(image).visibility !== 'hidden'),
        sourceComponent: image.getAttribute('data-source-component') || image.closest('section')?.querySelector('[data-source-component]')?.getAttribute('data-source-component') || 'unknown',
      })));
      const backgroundImages = await page.evaluate(() => {
        const urls = [];
        for (const element of document.querySelectorAll('*')) {
          const backgroundImage = getComputedStyle(element).backgroundImage;
          for (const match of backgroundImage.matchAll(/url\((['"]?)(.*?)\1\)/g)) {
            urls.push({ element: element.tagName.toLowerCase(), requestedUrl: match[2], sourceComponent: element.getAttribute('data-source-component') || element.closest('section')?.querySelector('[data-source-component]')?.getAttribute('data-source-component') || 'css-background' });
          }
        }
        return urls;
      });

      const imageFailures = pageImages
        .filter((image) => image.visible && (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0))
        .map((image) => ({ ...image, reason: 'image did not complete with natural dimensions' }));
      const remoteAssets = [...pageImages, ...backgroundImages]
        .filter((asset) => isRemote(asset.requestedUrl))
        .map((asset) => ({ ...asset, reason: 'unexpected remote image URL' }));
      const windowsPaths = [...pageImages, ...backgroundImages]
        .filter((asset) => /^[A-Za-z]:[\\/]|^\\\\/.test(asset.requestedUrl))
        .map((asset) => ({ ...asset, reason: 'Windows absolute image path' }));

      results.push({
        route,
        navigationStatus,
        navigationError,
        images: pageImages,
        backgrounds: backgroundImages,
        failedRequests,
        imageResponses,
        failures: [...imageFailures, ...remoteAssets, ...windowsPaths],
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const summary = {
    baseUrl,
    routes: results.length,
    imageCount: results.reduce((count, result) => count + result.images.length, 0),
    failedNetworkRequests: results.reduce((count, result) => count + result.failedRequests.length, 0),
    non2xxImageResponses: results.reduce((count, result) => count + result.imageResponses.length, 0),
    brokenImages: results.reduce((count, result) => count + result.failures.filter((failure) => failure.reason.includes('natural dimensions')).length, 0),
    remoteImageUrls: results.reduce((count, result) => count + result.failures.filter((failure) => failure.reason.includes('remote')).length, 0),
    windowsAbsolutePaths: results.reduce((count, result) => count + result.failures.filter((failure) => failure.reason.includes('Windows')).length, 0),
  };
  const report = { generatedAt: new Date().toISOString(), summary, results };
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify({ ...summary, failures: results.flatMap((result) => result.failures), report: path.relative(root, reportPath) }, null, 2));
  process.exitCode = summary.failedNetworkRequests || summary.non2xxImageResponses || summary.brokenImages || summary.remoteImageUrls || summary.windowsAbsolutePaths ? 1 : 0;
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
