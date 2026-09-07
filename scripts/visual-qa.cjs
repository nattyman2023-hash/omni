/**
 * Visual QA: captures full-page screenshots of the rebuilt About / Areas /
 * Bathroom pages, copies the Stitch reference PNGs, normalizes the
 * implementation screenshot to the reference's width (the references are
 * scaled-down full-page previews), and produces a semi-transparent overlay
 * comparison for each page. No extra image-processing dependency is added —
 * resizing/compositing is done with an offscreen <canvas> in Chromium via
 * Playwright, which is already a devDependency.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'visual-qa');
const baseUrl = process.env.QA_BASE_URL || 'http://localhost:3000';

const PAGES = [
  {
    name: 'home',
    route: '/',
    reference: path.join(
      root,
      'Omni Development',
      'stitch_omni_developments_digital_platform',
      'stitch_omni_developments_digital_platform',
      'omni_developments_manchester_home',
      'screen.png',
    ),
  },
  {
    name: 'services',
    route: '/services',
    reference: path.join(
      root,
      'Omni Development',
      'stitch_omni_developments_digital_platform',
      'stitch_omni_developments_digital_platform',
      'omni_developments_manchester_services',
      'screen.png',
    ),
  },
  {
    name: 'home-extensions',
    route: '/services/home-extensions',
    reference: path.join(
      root,
      'Omni Development',
      'stitch_omni_developments_digital_platform',
      'stitch_omni_developments_digital_platform',
      'omni_developments_manchester_home_extensions',
      'screen.png',
    ),
  },
  {
    name: 'how-it-works',
    route: '/how-it-works',
    reference: path.join(
      root,
      'Omni Development',
      'stitch_omni_developments_digital_platform',
      'stitch_omni_developments_digital_platform',
      'omni_developments_manchester_how_it_works',
      'screen.png',
    ),
  },
  {
    name: 'project-case-study',
    route: '/projects/open-plan-extension',
    reference: path.join(
      root,
      'Omni Development',
      'stitch_omni_developments_digital_platform',
      'stitch_omni_developments_digital_platform',
      'omni_developments_manchester_project_case_study',
      'screen.png',
    ),
  },
  {
    name: 'about',
    route: '/about',
    reference: path.join(
      root,
      'Omni Development',
      'stitch_omni_developments_digital_platform',
      'stitch_omni_developments_digital_platform',
      'omni_developments_manchester_about_us',
      'screen.png',
    ),
  },
  {
    name: 'areas',
    route: '/areas',
    reference: path.join(
      root,
      'Omni Development',
      'stitch_omni_developments_digital_platform',
      'stitch_omni_developments_digital_platform',
      'omni_developments_manchester_areas_we_cover',
      'screen.png',
    ),
  },
  {
    name: 'bathroom',
    route: '/services/bathroom-renovations',
    reference: path.join(
      root,
      'Omni Development',
      'stitch_omni_developments_digital_platform',
      'stitch_omni_developments_digital_platform',
      'omni_developments_manchester_bathroom_installation',
      'screen.png',
    ),
  },
];

const CAPTURE_WIDTH = 1440;

async function toDataUri(filePath) {
  const buffer = await fs.readFile(filePath);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

(async () => {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const results = [];

  for (const pageDef of PAGES) {
    const context = await browser.newContext({ viewport: { width: CAPTURE_WIDTH, height: 1000 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(`${baseUrl}${pageDef.route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const implRawPath = path.join(outDir, `${pageDef.name}-implementation-raw.png`);
    await page.screenshot({ path: implRawPath, fullPage: true });
    await context.close();

    const refDataUri = await toDataUri(pageDef.reference);
    const implDataUri = await toDataUri(implRawPath);

    const compositor = await browser.newContext();
    const cpage = await compositor.newPage();
    await cpage.setContent('<html><body style="margin:0"></body></html>');

    const measurements = await cpage.evaluate(
      async ({ refDataUri, implDataUri }) => {
        function loadImage(src) {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
        }
        const [refImg, implImg] = await Promise.all([loadImage(refDataUri), loadImage(implDataUri)]);
        return {
          refWidth: refImg.naturalWidth,
          refHeight: refImg.naturalHeight,
          implWidth: implImg.naturalWidth,
          implHeight: implImg.naturalHeight,
        };
      },
      { refDataUri, implDataUri },
    );

    const scale = measurements.refWidth / measurements.implWidth;
    const implScaledHeight = Math.round(measurements.implHeight * scale);

    const outputs = await cpage.evaluate(
      async ({ refDataUri, implDataUri, refWidth, refHeight, implScaledHeight }) => {
        function loadImage(src) {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
        }
        const [refImg, implImg] = await Promise.all([loadImage(refDataUri), loadImage(implDataUri)]);

        // Implementation, normalized to the reference's width.
        const implCanvas = document.createElement('canvas');
        implCanvas.width = refWidth;
        implCanvas.height = implScaledHeight;
        const implCtx = implCanvas.getContext('2d');
        implCtx.drawImage(implImg, 0, 0, refWidth, implScaledHeight);
        const implNormalizedDataUrl = implCanvas.toDataURL('image/png');

        // Overlay: reference opaque, implementation at 50% alpha on top,
        // canvas sized to the taller of the two so nothing is clipped.
        const overlayHeight = Math.max(refHeight, implScaledHeight);
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = refWidth;
        overlayCanvas.height = overlayHeight;
        const overlayCtx = overlayCanvas.getContext('2d');
        overlayCtx.fillStyle = '#ffffff';
        overlayCtx.fillRect(0, 0, refWidth, overlayHeight);
        overlayCtx.globalAlpha = 1;
        overlayCtx.drawImage(refImg, 0, 0, refWidth, refHeight);
        overlayCtx.globalAlpha = 0.5;
        overlayCtx.drawImage(implCanvas, 0, 0);
        const overlayDataUrl = overlayCanvas.toDataURL('image/png');

        return { implNormalizedDataUrl, overlayDataUrl };
      },
      { refDataUri, implDataUri, refWidth: measurements.refWidth, refHeight: measurements.refHeight, implScaledHeight },
    );

    await compositor.close();

    const referenceOutPath = path.join(outDir, `${pageDef.name}-reference.png`);
    const implementationOutPath = path.join(outDir, `${pageDef.name}-implementation.png`);
    const overlayOutPath = path.join(outDir, `${pageDef.name}-overlay.png`);

    await fs.copyFile(pageDef.reference, referenceOutPath);
    await fs.writeFile(implementationOutPath, Buffer.from(outputs.implNormalizedDataUrl.split(',')[1], 'base64'));
    await fs.writeFile(overlayOutPath, Buffer.from(outputs.overlayDataUrl.split(',')[1], 'base64'));
    await fs.unlink(implRawPath);

    results.push({
      page: pageDef.name,
      route: pageDef.route,
      reference: { width: measurements.refWidth, height: measurements.refHeight },
      implementationCaptured: { width: measurements.implWidth, height: measurements.implHeight },
      implementationNormalized: { width: measurements.refWidth, height: implScaledHeight },
      heightRatio: (implScaledHeight / measurements.refHeight).toFixed(2),
    });
  }

  await browser.close();
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
