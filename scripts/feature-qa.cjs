const { chromium } = require('playwright');

const base = process.argv[2] || 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await desktop.goto(`${base}/services/property-renovations`, { waitUntil: 'networkidle' });
  await desktop.screenshot({ path: 'visual-qa/current/service-detail-1440.png', fullPage: true });
  await desktop.locator('button[aria-controls="mega-menu-services"]').click();
  await desktop.screenshot({ path: 'visual-qa/current/mega-menu-services-1440.png' });
  const desktopCheck = await desktop.evaluate(() => ({
    megaMenu: Boolean(document.querySelector('#mega-menu-services')),
    timelineColumns: getComputedStyle(document.querySelector('.timeline')).gridTemplateColumns,
    timelineItems: document.querySelectorAll('.timeline-item').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));

  const projectSlugs = ['open-plan-extension', 'property-improvements', 'bathroom-installation'];
  const projectChecks = [];
  for (const slug of projectSlugs) {
    await desktop.goto(`${base}/projects/${slug}`, { waitUntil: 'networkidle' });
    await desktop.waitForFunction(() => [...document.querySelectorAll('[data-source-component^="Project"]')].every((image) => image.complete && image.naturalWidth > 0), null, { timeout: 15000 });
    await desktop.evaluate(() => Promise.all([...document.images].map((image) => image.decode().catch(() => undefined))));
    if (slug === 'open-plan-extension') await desktop.screenshot({ path: 'visual-qa/current/project-template-1440.png', fullPage: true });
    projectChecks.push(await desktop.evaluate(() => ({
      galleryHeading: document.querySelector('#gallery h2')?.textContent?.trim(),
      galleryViewer: document.querySelectorAll('#gallery [data-source-component="ProjectGallery.Viewer"]').length,
      galleryThumbnails: document.querySelectorAll('#gallery [data-source-component="ProjectGallery.Thumbnail"]').length,
      relatedCards: document.querySelectorAll('a[href^="/projects/"]').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    })));
  }
  const projectApi = await desktop.request.get(`${base}/api/projects?published=1`);
  const projectApiPayload = await projectApi.json();

  const responsiveProjectChecks = [];
  for (const viewport of [{ name: '390x844', width: 390, height: 844 }, { name: '768x1024', width: 768, height: 1024 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    for (const slug of projectSlugs) {
      await page.goto(`${base}/projects/${slug}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => [...document.querySelectorAll('[data-source-component^="Project"]')].every((image) => image.complete && image.naturalWidth > 0), null, { timeout: 15000 });
      await page.evaluate(() => Promise.all([...document.images].map((image) => image.decode().catch(() => undefined))));
      await page.screenshot({ path: `visual-qa/current/${viewport.name}-project-${slug}.png`, fullPage: true });
      responsiveProjectChecks.push(await page.evaluate(() => ({
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        galleryHeading: document.querySelector('#gallery h2')?.textContent?.trim(),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      })));
    }
    await context.close();
  }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${base}/services`, { waitUntil: 'networkidle' });
  await mobile.getByRole('button', { name: 'Open menu' }).click();
  await mobile.screenshot({ path: 'visual-qa/current/mobile-menu-390.png' });
  const mobileCheck = await mobile.evaluate(() => ({
    menuLinks: document.querySelectorAll('nav').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  process.stdout.write(`${JSON.stringify({ desktop: desktopCheck, mobile: mobileCheck, projects: projectChecks, responsiveProjects: responsiveProjectChecks, publicProjectApi: { status: projectApi.status(), count: Array.isArray(projectApiPayload.projects) ? projectApiPayload.projects.length : -1 } })}\n`);
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
