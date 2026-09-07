/**
 * Visual comparison for the rebuilt Home Extensions page (Batch 1 evidence).
 * Same approach as compare-home.cjs but for /services/home-extensions vs
 * visual-reference/extensions-reference.png. Saves to visual-qa/home-extensions/.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'visual-qa', 'home-extensions');
const refPath = path.join(root, 'visual-reference', 'extensions-reference.png');
const baseUrl = process.argv[2] || 'http://localhost:4173';
const route = '/services/home-extensions';
const WIDTH = 1440, HEIGHT = 1000;

function dataUri(buf) { return 'data:image/png;base64,' + buf.toString('base64'); }

(async () => {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(baseUrl + route, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  const implPath = path.join(outDir, 'implementation.png');
  await page.screenshot({ path: implPath, fullPage: true });

  const m = await page.evaluate(() => {
    const sections = [...document.querySelectorAll('section')];
    const r = (el) => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), left: Math.round(b.left), width: Math.round(b.width), height: Math.round(b.height) }; };
    const container = document.querySelector('.max-w-container-max');
    return {
      sectionCount: sections.length,
      sectionBgs: sections.map((s) => (s.getAttribute('class') || '').split(' ').find((c) => c.startsWith('bg-')) || ''),
      containerLeft: container ? r(container).left : null,
      containerWidth: container ? r(container).width : null,
      pageHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
  await fs.writeFile(path.join(outDir, 'measurements.json'), JSON.stringify(m, null, 2));

  const [refBuf, implBuf] = await Promise.all([fs.readFile(refPath), fs.readFile(implPath)]);
  const comp = await browser.newPage();
  comp.setViewportSize({ width: WIDTH, height: HEIGHT });
  const outs = await comp.evaluate(async (args) => {
    const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const [ref, impl] = await Promise.all([load(args.ref), load(args.impl)]);
    const scale = ref.naturalWidth / impl.naturalWidth;
    const implH = Math.round(impl.naturalHeight * scale);
    const ss = document.createElement('canvas'); ss.width = ref.naturalWidth * 2 + 24; ss.height = Math.max(ref.naturalHeight, implH);
    const sx = ss.getContext('2d'); sx.fillStyle = '#fff'; sx.fillRect(0, 0, ss.width, ss.height);
    sx.drawImage(ref, 0, 0, ref.naturalWidth, ref.naturalHeight);
    sx.drawImage(impl, ref.naturalWidth + 24, 0, ref.naturalWidth, implH);
    const ov = document.createElement('canvas'); ov.width = ref.naturalWidth; ov.height = Math.max(ref.naturalHeight, implH);
    const ox = ov.getContext('2d'); ox.fillStyle = '#fff'; ox.fillRect(0, 0, ov.width, ov.height);
    ox.globalAlpha = 1; ox.drawImage(ref, 0, 0, ref.naturalWidth, ref.naturalHeight);
    ox.globalAlpha = 0.5; ox.drawImage(impl, 0, 0, ref.naturalWidth, implH);
    const df = document.createElement('canvas'); df.width = ref.naturalWidth; df.height = Math.max(ref.naturalHeight, implH);
    const dx = df.getContext('2d'); dx.fillStyle = '#fff'; dx.fillRect(0, 0, df.width, df.height);
    dx.drawImage(ref, 0, 0, ref.naturalWidth, ref.naturalHeight);
    dx.globalCompositeOperation = 'difference'; dx.drawImage(impl, 0, 0, ref.naturalWidth, implH);
    return { ss: ss.toDataURL('image/png'), ov: ov.toDataURL('image/png'), df: df.toDataURL('image/png'), refW: ref.naturalWidth, refH: ref.naturalHeight, implH };
  }, { ref: dataUri(refBuf), impl: dataUri(implBuf) });
  for (const [name, url] of [['side-by-side.png', outs.ss], ['overlay.png', outs.ov], ['difference.png', outs.df]]) {
    await fs.writeFile(path.join(outDir, name), Buffer.from(url.split(',')[1], 'base64'));
  }
  await browser.close();
  process.stdout.write(JSON.stringify({ route, measurements: m, reference: { width: outs.refW, height: outs.refH }, implementationNormalized: { width: outs.refW, height: outs.implH } }, null, 2) + '\n');
})().catch((e) => { process.stderr.write((e.stack || e) + '\n'); process.exitCode = 1; });
