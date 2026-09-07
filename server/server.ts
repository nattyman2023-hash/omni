import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import express, { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import mysql, { Pool, ResultSetHeader } from 'mysql2/promise';
import { z } from 'zod';
import { sendNotification } from './services/emailService';

const projectRoot = path.resolve(__dirname, '..');
const distPath = path.join(projectRoot, 'dist');
const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(projectRoot, 'uploads', 'private'));
const projectUploadRoot = path.resolve(process.env.PROJECT_UPLOAD_DIR || path.join(projectRoot, 'uploads', 'public', 'projects'));
const port = Number(process.env.PORT || 3000);
const stagingMode = ['1', 'true', 'yes'].includes(String(process.env.STAGING_MODE || '').trim().toLowerCase());
const outboundMessagesEnabled = ['1', 'true', 'yes'].includes(String(process.env.OUTBOUND_MESSAGES_ENABLED || '').trim().toLowerCase());
const secureCookie = process.env.COOKIE_SECURE === undefined
  ? process.env.NODE_ENV === 'production'
  : ['1', 'true', 'yes'].includes(String(process.env.COOKIE_SECURE).trim().toLowerCase());

const requiredDbKeys = ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD'];
const databaseConfigured = requiredDbKeys.every(key => Boolean(process.env[key]));
let pool: Pool | null = null;
if (databaseConfigured) {
  pool = mysql.createPool({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 3306),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    waitForConnections: true,
    connectionLimit: 5,
    charset: 'utf8mb4',
  });
}

type ContactRecord = { reference: string; name: string; email: string; phone: string; message: string; createdAt: string };
type QuoteRecord = { reference: string; projectType: string; contactName: string; email: string; files: string[]; createdAt: string };
type PublicationStatus = 'draft' | 'published' | 'archived';
type ProjectRecord = {
  id: number | string;
  slug: string;
  title: string;
  location: string;
  category: string;
  description: string;
  image: string;
  gallery: string[];
  tags: string[];
  published: boolean;
  publicationStatus: PublicationStatus;
  createdAt: string;
  updatedAt: string;
};
const localContacts: ContactRecord[] = [];
const localQuotes: QuoteRecord[] = [];
const localProjects = new Map<string, ProjectRecord>();
const sessions = new Map<string, number>();

const LOCAL_PROJECTS: Omit<ProjectRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    slug: 'open-plan-extension',
    title: 'Open-plan extension & garden connection',
    location: 'Supplied project gallery',
    category: 'Extensions',
    description: 'A visual record of structural work, new openings and the connection between a home and its garden.',
    image: '/images/site-interior.webp',
    gallery: ['/images/site-interior.webp', '/images/timber-frame.webp', '/images/works-site.webp', '/images/garden-landscaping.webp'],
    tags: ['Extension', 'Structural work', 'Openings'],
    published: true,
    publicationStatus: 'published',
  },
  {
    slug: 'property-improvements',
    title: 'Property improvements & external works',
    location: 'Supplied project gallery',
    category: 'Renovations',
    description: 'A collection of supplied photographs showing external improvements, landscaping and on-site progress.',
    image: '/images/project-renovation-01.webp',
    gallery: ['/images/project-renovation-01.webp', '/images/driveway-finish.webp', '/images/garden-beds.webp', '/images/home-front.webp'],
    tags: ['Renovation', 'External works', 'Landscaping'],
    published: true,
    publicationStatus: 'published',
  },
  {
    slug: 'bathroom-installation',
    title: 'Bathroom installation',
    location: 'Supplied project gallery',
    category: 'Bathrooms',
    description: 'A finished bathroom detail from the supplied photography, used here to show finish quality and installation detail.',
    image: '/images/project-bathroom-01.webp',
    gallery: ['/images/project-bathroom-01.webp', '/images/interior-stair.webp', '/images/site-interior.webp'],
    tags: ['Bathroom', 'Installation', 'Finishes'],
    published: true,
    publicationStatus: 'published',
  },
];
LOCAL_PROJECTS.forEach((project, index) => {
  const timestamp = new Date(0).toISOString();
  localProjects.set(project.slug, { ...project, id: `local-${index + 1}`, createdAt: timestamp, updatedAt: timestamp });
});

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
if (stagingMode) app.use((_req, res, next) => { res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive'); next(); });
app.use(cookieParser());
app.use(express.json({ limit: '150kb' }));
app.use(express.urlencoded({ extended: true, limit: '150kb' }));

const contactLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many enquiries from this network. Please try again shortly.' } });
const quoteLimiter = rateLimit({ windowMs: 20 * 60 * 1000, limit: 4, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many quote requests from this network. Please try again shortly.' } });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 8, fieldSize: 30 * 1024 },
});

function reference(prefix: string) {
  return `${prefix}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

function validMagic(file: Express.Multer.File) {
  const header = file.buffer.subarray(0, 12);
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  const isWebp = header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP';
  const isPdf = header.toString('ascii', 0, 4) === '%PDF';
  return isJpeg || isPng || isWebp || isPdf;
}

function validImageMagic(file: Express.Multer.File) {
  const header = file.buffer.subarray(0, 12);
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  const isWebp = header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP';
  return isJpeg || isPng || isWebp;
}

function safeExtension(file: Express.Multer.File) {
  const header = file.buffer.subarray(0, 12);
  if (header[0] === 0xff && header[1] === 0xd8) return 'jpg';
  if (header[0] === 0x89 && header[1] === 0x50) return 'png';
  if (header.toString('ascii', 0, 4) === 'RIFF') return 'webp';
  return 'pdf';
}

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(120),
  email: z.string().trim().email('Please enter a valid email address.'),
  phone: z.string().trim().min(7, 'Please enter a valid telephone number.').max(40),
  message: z.string().trim().min(10, 'Please add a little more detail.').max(5000),
  preferredContact: z.enum(['Email', 'Telephone', 'WhatsApp']).default('Email'),
  source: z.string().trim().max(120).default('unknown'),
  website: z.string().max(100).default(''),
  consent: z.coerce.boolean().refine(value => value, 'Privacy consent is required.'),
});

const quoteSchema = z.object({
  projectType: z.string().trim().min(1).max(80),
  propertyType: z.string().trim().min(1).max(80),
  postcode: z.string().trim().min(3).max(20),
  description: z.string().trim().min(10).max(8000),
  stage: z.string().trim().min(1).max(100),
  budget: z.string().trim().max(100).optional().default(''),
  start: z.string().trim().min(1).max(100),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(40),
  preferredContact: z.enum(['Email', 'Telephone', 'WhatsApp']).default('Email'),
  consent: z.coerce.boolean().refine(value => value, 'Privacy consent is required.'),
});

const projectAssetSchema = z.string().trim().min(1).max(255).refine(value => value.startsWith('/images/') || value.startsWith('/uploads/'), 'Images must use an approved local asset path.');
const projectSchema = z.object({
  slug: z.string().trim().min(2).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens for the URL slug.'),
  title: z.string().trim().min(2).max(190),
  location: z.string().trim().min(2).max(190),
  category: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(3000),
  image: projectAssetSchema,
  gallery: z.array(projectAssetSchema).max(24).default([]),
  tags: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  published: z.boolean().default(false),
});

function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues[0]?.message || 'Please check the submitted details.';
    return { data: null, message } as const;
  }
  return { data: result.data as z.infer<T>, message: '' } as const;
}

async function bootstrapAdministrator() {
  if (!pool) return;
  const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '');
  const displayName = String(process.env.BOOTSTRAP_ADMIN_NAME || 'Omni Administrator').trim().slice(0, 120);
  if (!email || !password) return;
  const [adminRows] = await pool.execute('SELECT id FROM users WHERE role IN (\'owner\', \'admin\') LIMIT 1');
  if ((adminRows as Array<{ id: number }>).length > 0) return;
  const [existingRows] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if ((existingRows as Array<{ id: number }>).length > 0) return;
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.execute('INSERT INTO users (email, password_hash, display_name, role, is_active) VALUES (?, ?, ?, \'owner\', TRUE)', [email, passwordHash, displayName]);
  process.stdout.write('Administrator bootstrap completed. Remove BOOTSTRAP_ADMIN_PASSWORD after the first successful login.\n');
}

type ProjectInput = z.infer<typeof projectSchema>;
type ProjectDbRow = { id: number; slug: string; title: string; location_label: string | null; description: string; category_name: string | null; publication_status: PublicationStatus; created_at: Date | string; updated_at: Date | string; image: string | null };
type ProjectMediaRow = { project_id: number; stored_filename: string; alt_text: string; sort_order: number };
type ProjectTagRow = { project_id: number; tag: string; sort_order: number };

function asIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function categorySlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 160) || 'projects';
}

function localProjectById(id: string) {
  return Array.from(localProjects.values()).find(project => String(project.id) === id);
}

async function listProjects(includeUnpublished = false): Promise<ProjectRecord[]> {
  const activePool = pool;
  if (!activePool) {
    return Array.from(localProjects.values()).filter(project => includeUnpublished || project.published);
  }

  const statusFilter = includeUnpublished ? '' : "WHERE p.publication_status = 'published'";
  const [baseRows] = await activePool.query(`
    SELECT p.id, p.slug, p.title, p.location_label, p.description,
           pc.name AS category_name, p.publication_status, p.created_at, p.updated_at,
           hero.stored_filename AS image
    FROM projects p
    LEFT JOIN project_categories pc ON pc.id = p.category_id
    LEFT JOIN project_media hero ON hero.project_id = p.id AND hero.sort_order = 0 AND hero.media_kind = 'image'
    ${statusFilter}
    ORDER BY p.updated_at DESC, p.id DESC
  `);
  const rows = baseRows as ProjectDbRow[];
  if (!rows.length) return [];
  const ids = rows.map(row => row.id);
  const placeholders = ids.map(() => '?').join(',');
  const [mediaRows] = await activePool.query(`SELECT project_id, stored_filename, alt_text, sort_order FROM project_media WHERE project_id IN (${placeholders}) AND media_kind = 'image' ORDER BY sort_order ASC, id ASC`, ids);
  const [tagRows] = await activePool.query(`SELECT project_id, tag, sort_order FROM project_tags WHERE project_id IN (${placeholders}) ORDER BY sort_order ASC, id ASC`, ids);
  const mediaByProject = new Map<number, ProjectMediaRow[]>();
  for (const row of mediaRows as ProjectMediaRow[]) mediaByProject.set(row.project_id, [...(mediaByProject.get(row.project_id) || []), row]);
  const tagsByProject = new Map<number, ProjectTagRow[]>();
  for (const row of tagRows as ProjectTagRow[]) tagsByProject.set(row.project_id, [...(tagsByProject.get(row.project_id) || []), row]);

  return rows.map(row => {
    const media = mediaByProject.get(row.id) || [];
    const gallery = media.map(item => item.stored_filename);
    const tags = (tagsByProject.get(row.id) || []).map(item => item.tag);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      location: row.location_label || 'Project gallery',
      category: row.category_name || 'Project',
      description: row.description,
      image: row.image || gallery[0] || '',
      gallery,
      tags,
      published: row.publication_status === 'published',
      publicationStatus: row.publication_status,
      createdAt: asIso(row.created_at),
      updatedAt: asIso(row.updated_at),
    };
  });
}

async function findPublishedProject(slug: string) {
  return (await listProjects(false)).find(project => project.slug === slug) || null;
}

function localProjectFromInput(input: ProjectInput, id: number | string): ProjectRecord {
  const timestamp = new Date().toISOString();
  return {
    ...input,
    id,
    gallery: input.gallery.length ? input.gallery : [input.image],
    published: input.published,
    publicationStatus: input.published ? 'published' : 'draft',
    createdAt: localProjectById(String(id))?.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

async function ensureProjectCategory(activePool: Pool, name: string) {
  const slug = categorySlug(name);
  const [result] = await activePool.execute<ResultSetHeader>('INSERT INTO project_categories (name, slug) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)', [name, slug]);
  return result.insertId;
}

async function replaceProjectMedia(activePool: Pool, projectId: number, input: ProjectInput) {
  await activePool.execute('DELETE FROM project_media WHERE project_id = ?', [projectId]);
  const media = [input.image, ...input.gallery.filter(image => image !== input.image)];
  for (const [sortOrder, filename] of media.entries()) {
    await activePool.execute('INSERT INTO project_media (project_id, stored_filename, alt_text, media_kind, sort_order) VALUES (?, ?, ?, \'image\', ?)', [projectId, filename, `${input.title} - supplied project photography`, sortOrder]);
  }
}

async function replaceProjectTags(activePool: Pool, projectId: number, input: ProjectInput) {
  await activePool.execute('DELETE FROM project_tags WHERE project_id = ?', [projectId]);
  for (const [sortOrder, tag] of input.tags.entries()) await activePool.execute('INSERT INTO project_tags (project_id, tag, sort_order) VALUES (?, ?, ?)', [projectId, tag, sortOrder]);
}

async function saveProjectToDatabase(input: ProjectInput, projectId?: number) {
  const activePool = pool;
  if (!activePool) throw new Error('Database is not configured.');
  const categoryId = await ensureProjectCategory(activePool, input.category);
  let id = projectId;
  if (id === undefined) {
    const [result] = await activePool.execute<ResultSetHeader>('INSERT INTO projects (slug, title, location_label, description, category_id, publication_status) VALUES (?, ?, ?, ?, ?, ?)', [input.slug, input.title, input.location, input.description, categoryId, input.published ? 'published' : 'draft']);
    id = result.insertId;
  } else {
    await activePool.execute('UPDATE projects SET slug = ?, title = ?, location_label = ?, description = ?, category_id = ?, publication_status = ? WHERE id = ?', [input.slug, input.title, input.location, input.description, categoryId, input.published ? 'published' : 'draft', id]);
  }
  await replaceProjectMedia(activePool, id, input);
  await replaceProjectTags(activePool, id, input);
  return (await listProjects(true)).find(project => project.id === id) || null;
}

async function saveContact(data: z.infer<typeof contactSchema>, publicReference: string) {
  const createdAt = new Date().toISOString();
  localContacts.push({ reference: publicReference, name: data.name, email: data.email, phone: data.phone, message: data.message, createdAt });
  if (pool) {
    await pool.execute(
      'INSERT INTO contact_enquiries (public_reference, name, email, telephone, preferred_contact_method, message, source_page, privacy_consent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [publicReference, data.name, data.email, data.phone, data.preferredContact, data.message, data.source, true],
    );
  }
  const notification = await sendNotification({ kind: 'contact', reference: publicReference, name: data.name, email: data.email, summary: data.message });
  if (pool) await pool.execute('UPDATE contact_enquiries SET notification_status = ?, notification_error = ? WHERE public_reference = ?', [notification.status, notification.error || null, publicReference]);
  return createdAt;
}

async function saveQuote(data: z.infer<typeof quoteSchema>, publicReference: string, files: { storedFilename: string; originalName: string; mimeType: string; size: number }[]) {
  const createdAt = new Date().toISOString();
  localQuotes.push({ reference: publicReference, projectType: data.projectType, contactName: data.contactName, email: data.email, files: files.map(file => file.originalName), createdAt });
  if (pool) {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO quote_requests (public_reference, project_type, property_type, postcode, description, project_stage, budget_range, desired_start, contact_name, email, telephone, preferred_contact_method, privacy_consent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [publicReference, data.projectType, data.propertyType, data.postcode, data.description, data.stage, data.budget, data.start, data.contactName, data.email, data.phone, data.preferredContact, true],
    );
    for (const file of files) {
      await pool.execute('INSERT INTO quote_request_files (quote_request_id, stored_filename, original_filename, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [result.insertId, file.storedFilename, file.originalName, file.mimeType, file.size]);
    }
  }
  const notification = await sendNotification({ kind: 'quote', reference: publicReference, name: data.contactName, email: data.email, summary: `${data.projectType} — ${data.postcode}` });
  if (pool) await pool.execute('UPDATE quote_requests SET notification_status = ?, notification_error = ? WHERE public_reference = ?', [notification.status, notification.error || null, publicReference]);
  return createdAt;
}

function adminRequired(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.omni_staff_session as string | undefined;
  if (!token || !sessions.has(token) || (sessions.get(token) || 0) < Date.now()) return res.status(401).json({ message: 'Staff authentication required.' });
  next();
}

async function healthPayload() {
  let database = 'not-configured';
  if (pool) {
    try { await pool.query('SELECT 1'); database = 'connected'; } catch { database = 'unavailable'; }
  }
  const payload: { status: string; service: string; timestamp: string; database?: string } = { status: 'ok', service: 'omni-development-site', timestamp: new Date().toISOString() };
  if (!stagingMode) payload.database = database;
  return payload;
}

app.get(['/health', '/api/health'], async (_req, res) => { res.json(await healthPayload()); });

app.get('/api/site-settings', (_req, res) => res.json({ name: 'Omni Developments', area: 'Greater Manchester & Cheshire', phone: process.env.PUBLIC_PHONE || '07928 149 731', email: process.env.PUBLIC_EMAIL || 'admin@omnidevelopment.co.uk', whatsapp: process.env.PUBLIC_WHATSAPP || 'https://wa.me/447928149731', stagingMode, outboundMessagesEnabled }));

app.get('/api/projects', async (_req, res, next) => {
  try { res.json({ projects: await listProjects(false), database: pool ? 'configured' : 'not-configured' }); } catch (error) { next(error); }
});

app.get('/api/projects/:slug', async (req, res, next) => {
  try {
    const project = await findPublishedProject(req.params.slug);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    return res.json(project);
  } catch (error) { return next(error); }
});

app.post('/api/contact', contactLimiter, async (req, res, next) => {
  const parsed = parseBody(contactSchema, req.body);
  if (parsed.data?.website) return res.status(400).json({ message: 'Unable to process this enquiry.' });
  if (!parsed.data) return res.status(400).json({ message: parsed.message });
  const publicReference = reference('ENQ');
  try { await saveContact(parsed.data, publicReference); res.status(201).json({ reference: publicReference, message: 'Your enquiry has been received. We will follow up using the details you provided.' }); } catch (error) { next(error); }
});

app.post('/api/quote', quoteLimiter, upload.array('files', 8), async (req, res, next) => {
  const parsed = parseBody(quoteSchema, req.body);
  if (!parsed.data) return res.status(400).json({ message: parsed.message });
  const files = (req.files as Express.Multer.File[] | undefined) || [];
  if (files.some(file => !validMagic(file))) return res.status(400).json({ message: 'One or more uploads could not be verified as a supported file type.' });
  const storedFiles: { storedFilename: string; originalName: string; mimeType: string; size: number }[] = [];
  try {
    if (files.length) await fs.mkdir(uploadRoot, { recursive: true });
    for (const file of files) {
      const storedFilename = `${crypto.randomUUID()}.${safeExtension(file)}`;
      await fs.writeFile(path.join(uploadRoot, storedFilename), file.buffer, { flag: 'wx' });
      storedFiles.push({ storedFilename, originalName: file.originalname.slice(0, 180), mimeType: file.mimetype, size: file.size });
    }
    const publicReference = reference('QTE');
    await saveQuote(parsed.data, publicReference, storedFiles);
    res.status(201).json({ reference: publicReference, message: 'Your quote request has been received.', files: storedFiles.map(file => file.originalName) });
  } catch (error) { next(error); }
});

app.post('/api/admin/project-images', adminRequired, upload.array('images', 8), async (req, res, next) => {
  const files = (req.files as Express.Multer.File[] | undefined) || [];
  if (!files.length) return res.status(400).json({ message: 'Choose at least one JPG, PNG or WebP image.' });
  if (files.some(file => !validImageMagic(file))) return res.status(400).json({ message: 'Project uploads must be JPG, PNG or WebP images.' });
  try {
    await fs.mkdir(projectUploadRoot, { recursive: true });
    const images: { path: string; originalName: string }[] = [];
    for (const file of files) {
      const storedFilename = `${crypto.randomUUID()}.${safeExtension(file)}`;
      await fs.writeFile(path.join(projectUploadRoot, storedFilename), file.buffer, { flag: 'wx' });
      images.push({ path: `/uploads/projects/${storedFilename}`, originalName: file.originalname.slice(0, 180) });
    }
    return res.status(201).json({ images, message: `${images.length} project image${images.length === 1 ? '' : 's'} uploaded.` });
  } catch (error) { return next(error); }
});

app.post('/api/admin/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  let valid = false;
  if (pool) {
    try {
      const [rows] = await pool.execute('SELECT password_hash FROM users WHERE email = ? AND is_active = TRUE LIMIT 1', [email]);
      const user = (rows as Array<{ password_hash: string }>)[0];
      valid = Boolean(user) && await bcrypt.compare(password, user.password_hash);
    } catch {
      return res.status(503).json({ message: 'Staff access is temporarily unavailable.' });
    }
  } else {
    const configuredEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const configuredHash = String(process.env.ADMIN_PASSWORD_HASH || '');
    if (!configuredEmail || !configuredHash) return res.status(503).json({ message: 'Staff access is not configured yet. Add ADMIN_EMAIL and ADMIN_PASSWORD_HASH to the environment.' });
    valid = email === configuredEmail && await bcrypt.compare(password, configuredHash);
  }
  if (!valid) return res.status(401).json({ message: 'The email or password was not recognised.' });
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + 8 * 60 * 60 * 1000);
  res.cookie('omni_staff_session', token, { httpOnly: true, secure: secureCookie, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 });
  res.json({ authenticated: true });
});

app.get('/api/admin/summary', adminRequired, (_req, res) => res.json({ contacts: localContacts.length, quotes: localQuotes.length, database: databaseConfigured ? 'configured' : 'not-configured' }));
app.get('/api/admin/projects', adminRequired, async (_req, res, next) => {
  try { res.json({ projects: await listProjects(true), database: pool ? 'configured' : 'not-configured' }); } catch (error) { next(error); }
});
app.post('/api/admin/projects', adminRequired, async (req, res, next) => {
  const parsed = parseBody(projectSchema, req.body);
  if (!parsed.data) return res.status(400).json({ message: parsed.message });
  try {
    if (pool) {
      if ((await listProjects(true)).some(project => project.slug === parsed.data.slug)) return res.status(409).json({ message: 'A project with this URL slug already exists.' });
      const project = await saveProjectToDatabase(parsed.data);
      return res.status(201).json({ project });
    }
    if (localProjects.has(parsed.data.slug)) return res.status(409).json({ message: 'A project with this URL slug already exists.' });
    const id = `local-${crypto.randomUUID()}`;
    const project = localProjectFromInput(parsed.data, id);
    localProjects.set(project.slug, project);
    return res.status(201).json({ project });
  } catch (error) { return next(error); }
});
app.patch('/api/admin/projects/:id', adminRequired, async (req, res, next) => {
  const parsed = parseBody(projectSchema, req.body);
  if (!parsed.data) return res.status(400).json({ message: parsed.message });
  try {
    if (pool) {
      const projectId = Number(req.params.id);
      if (!Number.isInteger(projectId) || projectId < 1) return res.status(400).json({ message: 'Invalid project id.' });
      const allProjects = await listProjects(true);
      const current = allProjects.find(project => project.id === projectId);
      if (!current) return res.status(404).json({ message: 'Project not found.' });
      if (allProjects.some(project => project.slug === parsed.data.slug && project.id !== projectId)) return res.status(409).json({ message: 'A project with this URL slug already exists.' });
      return res.json({ project: await saveProjectToDatabase(parsed.data, projectId) });
    }
    const projectParam = String(req.params.id);
    const current = localProjectById(projectParam);
    if (!current) return res.status(404).json({ message: 'Project not found.' });
    const duplicate = localProjects.get(parsed.data.slug);
    if (duplicate && String(duplicate.id) !== projectParam) return res.status(409).json({ message: 'A project with this URL slug already exists.' });
    localProjects.delete(current.slug);
    const project = localProjectFromInput(parsed.data, current.id);
    localProjects.set(project.slug, project);
    return res.json({ project });
  } catch (error) { return next(error); }
});
app.delete('/api/admin/projects/:id', adminRequired, async (req, res, next) => {
  try {
    if (pool) {
      const projectId = Number(req.params.id);
      if (!Number.isInteger(projectId) || projectId < 1) return res.status(400).json({ message: 'Invalid project id.' });
      const [result] = await pool.execute<ResultSetHeader>("UPDATE projects SET publication_status = 'archived' WHERE id = ?", [projectId]);
      if (!result.affectedRows) return res.status(404).json({ message: 'Project not found.' });
    } else {
      const current = localProjectById(String(req.params.id));
      if (!current) return res.status(404).json({ message: 'Project not found.' });
      localProjects.set(current.slug, { ...current, published: false, publicationStatus: 'archived', updatedAt: new Date().toISOString() });
    }
    return res.json({ message: 'Project archived.' });
  } catch (error) { return next(error); }
});
app.post('/api/admin/logout', adminRequired, (req, res) => { const token = req.cookies?.omni_staff_session as string | undefined; if (token) sessions.delete(token); res.clearCookie('omni_staff_session'); res.status(204).end(); });

app.get('/robots.txt', (_req, res) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  if (stagingMode) return res.type('text/plain').send('User-agent: *\nDisallow: /\n');
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /staff\nDisallow: /api\nSitemap: ${appUrl}/sitemap.xml`);
});
app.get('/sitemap.xml', (_req, res) => { const urls = ['/', '/services', '/projects', '/how-it-works', '/about', '/reviews', '/areas', '/guides', '/contact', '/quote']; res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${process.env.APP_URL || 'http://localhost:3000'}${url}</loc></url>`).join('')}</urlset>`); });

app.use('/uploads/projects', express.static(projectUploadRoot, { maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0 }));
app.use(express.static(distPath, { maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0 }));
const spaRoutes = new Set([
  '/', '/services', '/projects', '/how-it-works', '/about', '/reviews', '/areas', '/guides', '/contact', '/quote',
  '/quote/thank-you', '/privacy', '/cookies', '/terms', '/staff/login', '/staff', '/staff/leads', '/staff/site-visits',
  '/staff/quotes', '/staff/projects', '/staff/calendar', '/staff/tasks', '/staff/invoices',
  '/services/home-extensions', '/services/loft-conversions', '/services/property-renovations', '/services/property-refurbishments',
  '/services/kitchen-renovations', '/services/bathroom-renovations', '/services/general-building-work',
  '/projects/open-plan-extension', '/projects/property-improvements', '/projects/bathroom-installation',
  '/areas/manchester', '/areas/salford', '/areas/sale', '/areas/altrincham', '/areas/hale', '/areas/stockport',
  '/areas/cheadle', '/areas/bramhall', '/areas/hazel-grove', '/areas/wilmslow',
  '/guides/greater-manchester-home-extension-guide', '/guides/planning-your-home-extension', '/guides/choosing-a-design-and-build-partner',
]);
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (req.method === 'GET') {
    let validRoute = spaRoutes.has(req.path);
    const projectPath = req.path.match(/^\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
    if (!validRoute && projectPath) {
      try { validRoute = Boolean(await findPublishedProject(projectPath[1])); } catch { validRoute = Boolean(localProjects.get(projectPath[1])?.published); }
    }
    const status = validRoute ? 200 : 404;
    return res.status(status).sendFile(path.join(distPath, 'index.html'));
  }
  next();
});
app.use((_req, res) => res.status(404).json({ message: 'Not found.' }));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => { if (error instanceof multer.MulterError) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Each upload must be 8 MB or smaller.' : 'Upload could not be processed.' }); console.error(error); res.status(500).json({ message: 'The request could not be completed. Please try again.' }); });

async function startServer() {
  try {
    await bootstrapAdministrator();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown database bootstrap error';
    console.error(`Administrator bootstrap failed: ${message}`);
    process.exitCode = 1;
    return;
  }
  const server = app.listen(port, '0.0.0.0', () => process.stdout.write(`Omni Development server listening on port ${port}${stagingMode ? ' (temporary review mode)' : ''}\n`));
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    process.stdout.write(`Received ${signal}; closing Omni Development server.\n`);
    server.close(() => {
      const closePool = pool ? pool.end() : Promise.resolve();
      void closePool.finally(() => process.exit(0));
    });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) void startServer();
export default app;
