const bcrypt = require('bcryptjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

process.env.PORT = '3001';
process.env.ADMIN_EMAIL = 'local-owner@omni.test';
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('LocalOwnerOnly-2026!', 10);
const app = require('../dist-server/server.js').default;

(async () => {
  const server = app.listen(3001, '127.0.0.1');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const base = 'http://localhost:3001';

  const unauthorised = await context.request.get(`${base}/api/admin/projects`);
  if (unauthorised.status() !== 401) throw new Error(`Expected 401, got ${unauthorised.status()}`);
  const login = await context.request.post(`${base}/api/admin/login`, { data: { email: 'local-owner@omni.test', password: 'LocalOwnerOnly-2026!' } });
  if (login.status() !== 200) throw new Error(`Login failed: ${login.status()}`);
  await page.goto(`${base}/staff/projects`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'visual-qa/current/staff-projects-1440.png', fullPage: true });
  const galleryField = page.getByLabel('Gallery image paths');
  const initialGallery = (await galleryField.inputValue()).split('\n').filter(Boolean);
  if (initialGallery.length !== 4) throw new Error(`Expected 4 seeded gallery paths, got ${initialGallery.length}`);
  await page.getByRole('button', { name: 'Move gallery image 2 up' }).click();
  const reorderedGallery = (await galleryField.inputValue()).split('\n').filter(Boolean);
  if (reorderedGallery[0] !== initialGallery[1] || reorderedGallery[1] !== initialGallery[0]) throw new Error('Gallery reorder control did not update the ordered field.');
  await page.getByRole('button', { name: 'Remove gallery image 1' }).click();
  const removedGallery = (await galleryField.inputValue()).split('\n').filter(Boolean);
  if (removedGallery.length !== 3 || removedGallery[0] !== initialGallery[0]) throw new Error('Gallery remove control did not update the ordered field.');
  await page.locator('#project-image-upload').setInputFiles(path.resolve('public/images/site-interior.webp'));
  await page.getByText(/image uploaded/i).waitFor({ state: 'visible' });
  const uploadedPath = (await galleryField.inputValue()).split('\n').find((item) => item.startsWith('/uploads/projects/'));
  if (!uploadedPath) throw new Error('Project image uploader did not add the returned path to the gallery.');
  await fs.unlink(path.join('uploads/public/projects', path.basename(uploadedPath))).catch(() => undefined);

  const payload = {
    slug: 'local-cms-qa-project',
    title: 'Local CMS QA project',
    location: 'Local QA only',
    category: 'Extensions',
    description: 'Temporary local QA record; removed before this test ends.',
    image: '/images/site-interior.webp',
    gallery: ['/images/site-interior.webp'],
    tags: ['QA'],
    published: false,
  };
  const created = await context.request.post(`${base}/api/admin/projects`, { data: payload });
  if (created.status() !== 201) throw new Error(`Create failed: ${created.status()} ${await created.text()}`);
  const createdProject = (await created.json()).project;
  const hidden = await context.request.get(`${base}/api/projects/${payload.slug}`);
  if (hidden.status() !== 404) throw new Error(`Draft was public: ${hidden.status()}`);
  const published = await context.request.patch(`${base}/api/admin/projects/${createdProject.id}`, { data: { ...payload, published: true } });
  if (published.status() !== 200) throw new Error(`Publish failed: ${published.status()} ${await published.text()}`);
  const visible = await context.request.get(`${base}/api/projects/${payload.slug}`);
  if (visible.status() !== 200) throw new Error(`Published project missing: ${visible.status()}`);
  const archived = await context.request.delete(`${base}/api/admin/projects/${createdProject.id}`);
  if (archived.status() !== 200) throw new Error(`Archive failed: ${archived.status()}`);
  const gone = await context.request.get(`${base}/api/projects/${payload.slug}`);
  if (gone.status() !== 404) throw new Error(`Archived project remained public: ${gone.status()}`);
  const logout = await context.request.post(`${base}/api/admin/logout`);
  if (logout.status() !== 204) throw new Error(`Logout failed: ${logout.status()}`);
  const postLogout = await context.request.get(`${base}/api/admin/projects`);
  if (postLogout.status() !== 401) throw new Error(`Expected post-logout 401, got ${postLogout.status()}`);
  process.stdout.write(`${JSON.stringify({ unauthorised: unauthorised.status(), projectGalleryControls: 'passed', projectImageUpload: 'passed', create: created.status(), draft: hidden.status(), publish: published.status(), visible: visible.status(), archive: archived.status(), archivedPublicCheck: gone.status(), postLogout: postLogout.status() })}\n`);
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
