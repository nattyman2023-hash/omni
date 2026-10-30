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
const productionMode = process.env.NODE_ENV === 'production';
const stagingMode = ['1', 'true', 'yes'].includes(String(process.env.STAGING_MODE || '').trim().toLowerCase());
const outboundMessagesEnabled = ['1', 'true', 'yes'].includes(String(process.env.OUTBOUND_MESSAGES_ENABLED || '').trim().toLowerCase());
const secureCookie = process.env.COOKIE_SECURE === undefined
  ? productionMode
  : ['1', 'true', 'yes'].includes(String(process.env.COOKIE_SECURE).trim().toLowerCase());
// reCAPTCHA v2 is enforced on public forms only when both keys are configured.
const recaptchaSiteKey = String(process.env.RECAPTCHA_SITE_KEY || '').trim();
const recaptchaSecretKey = String(process.env.RECAPTCHA_SECRET_KEY || '').trim();
const recaptchaEnabled = Boolean(recaptchaSiteKey && recaptchaSecretKey);

const requiredDbKeys = ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD'];
const databaseConfigured = requiredDbKeys.every(key => Boolean(process.env[key]));
type DatabaseStatus = 'not-configured' | 'unchecked' | 'connected' | 'unavailable';
let databaseStatus: DatabaseStatus = databaseConfigured ? 'unchecked' : 'not-configured';
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

const productionTables = ['users', 'projects', 'contact_enquiries', 'quote_requests', 'quote_request_files', 'staff_sessions', 'activity_audit_records', 'crm_site_visits', 'crm_tasks', 'crm_calendar_events', 'crm_invoices'] as const;
const enquiryUnavailableMessage = "We couldn't send your enquiry, please call or email us.";

class DatabaseUnavailableError extends Error {
  constructor(message = enquiryUnavailableMessage) {
    super(message);
    this.name = 'DatabaseUnavailableError';
  }
}

function databaseErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return 'unknown';
  const code = String((error as { code?: unknown }).code || 'unknown');
  return /^[A-Z0-9_]+$/.test(code) ? code : 'unknown';
}

function reportDatabaseFailure(context: string, error?: unknown) {
  databaseStatus = pool ? 'unavailable' : 'not-configured';
  const suffix = error ? ` code=${databaseErrorCode(error)}` : '';
  console.error(`[database] ${context}.${suffix} Credentials and connection details were not logged.`);
}

async function verifyProductionDatabase() {
  if (!productionMode) return;
  if (!pool) {
    reportDatabaseFailure('Production MySQL configuration is missing');
    throw new DatabaseUnavailableError();
  }
  try {
    for (const table of productionTables) await pool.query(`SELECT 1 FROM \`${table}\` LIMIT 0`);
    databaseStatus = 'connected';
  } catch (error) {
    reportDatabaseFailure('Production MySQL is unreachable or its schema is incomplete', error);
    throw new DatabaseUnavailableError();
  }
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
const localSessions = new Map<string, number>();

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
// Express treats a string as an address list, so a hop count such as Hostinger's TRUST_PROXY=1 must be numeric.
const trustProxy = String(process.env.TRUST_PROXY || '').trim();
if (trustProxy) app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === 'true' ? true : trustProxy);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
if (stagingMode) app.use((_req, res, next) => { res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive'); next(); });
app.use(cookieParser());
app.use(express.json({ limit: '150kb' }));
app.use(express.urlencoded({ extended: true, limit: '150kb' }));

const contactLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many enquiries from this network. Please try again shortly.' } });
const quoteLimiter = rateLimit({ windowMs: 20 * 60 * 1000, limit: 4, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many quote requests from this network. Please try again shortly.' } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many sign-in attempts. Please wait and try again.' } });
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

/** Returns an error message when the submitted reCAPTCHA token is missing or rejected; empty string when it passes. */
async function recaptchaFailure(body: unknown, remoteIp: string | undefined) {
  if (!recaptchaEnabled) return '';
  const token = String((body as Record<string, unknown> | undefined)?.recaptchaToken || '').trim();
  if (!token || token.length > 4000) return 'Please tick the "I\'m not a robot" box before sending.';
  try {
    const params = new URLSearchParams({ secret: recaptchaSecretKey, response: token });
    if (remoteIp) params.set('remoteip', remoteIp);
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', body: params, signal: AbortSignal.timeout(8000) });
    const result = await response.json() as { success?: boolean };
    return result.success ? '' : 'The robot check expired or failed. Please tick the box again.';
  } catch (error) {
    console.error('reCAPTCHA verification unavailable', error);
    return "We couldn't verify the robot check. Please try again or call us.";
  }
}

async function bootstrapAdministrator() {
  if (!pool) return;
  const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '');
  const displayName = String(process.env.BOOTSTRAP_ADMIN_NAME || 'Omni Administrator').trim().slice(0, 120);
  if (!email || password.length < 12) return;
  const [adminRows] = await pool.execute('SELECT id FROM users WHERE role IN (\'owner\', \'admin\') LIMIT 1');
  if ((adminRows as Array<{ id: number }>).length > 0) return;
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.execute(
    "INSERT INTO users (email, password_hash, display_name, role, is_active) SELECT ?, ?, ?, 'owner', TRUE WHERE NOT EXISTS (SELECT 1 FROM users WHERE role IN ('owner','admin'))",
    [email, passwordHash, displayName],
  );
}

async function auditAuthentication(userId: number | null, action: string, email: string) {
  if (!pool) return;
  try {
    await pool.execute(
      "INSERT INTO activity_audit_records (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, 'authentication', ?, ?)",
      [userId, action, userId, JSON.stringify({ emailHash: crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex') })],
    );
  } catch {
    console.error('[authentication] Audit record could not be stored.');
  }
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
    if (productionMode) throw new DatabaseUnavailableError('Project information is temporarily unavailable. Please try again shortly.');
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
  if (!pool) {
    if (productionMode) throw new DatabaseUnavailableError();
    localContacts.push({ reference: publicReference, name: data.name, email: data.email, phone: data.phone, message: data.message, createdAt });
  } else {
    try {
      await pool.execute(
        'INSERT INTO contact_enquiries (public_reference, name, email, telephone, preferred_contact_method, message, source_page, privacy_consent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [publicReference, data.name, data.email, data.phone, data.preferredContact, data.message, data.source, true],
      );
      databaseStatus = 'connected';
    } catch (error) {
      reportDatabaseFailure('Contact enquiry could not be stored', error);
      throw new DatabaseUnavailableError();
    }
  }
  const notification = await sendNotification({ kind: 'contact', reference: publicReference, name: data.name, email: data.email, summary: data.message });
  if (pool) {
    try {
      await pool.execute('UPDATE contact_enquiries SET notification_status = ?, notification_error = ? WHERE public_reference = ?', [notification.status, notification.error || null, publicReference]);
    } catch (error) {
      reportDatabaseFailure('Contact notification status could not be updated after the enquiry was stored', error);
    }
  }
  return createdAt;
}

async function saveQuote(data: z.infer<typeof quoteSchema>, publicReference: string, files: { storedFilename: string; originalName: string; mimeType: string; size: number }[]) {
  const createdAt = new Date().toISOString();
  if (!pool) {
    if (productionMode) throw new DatabaseUnavailableError();
    localQuotes.push({ reference: publicReference, projectType: data.projectType, contactName: data.contactName, email: data.email, files: files.map(file => file.originalName), createdAt });
  } else {
    const connection = await pool.getConnection().catch(error => {
      reportDatabaseFailure('Quote database connection could not be acquired', error);
      throw new DatabaseUnavailableError();
    });
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute<ResultSetHeader>(
        'INSERT INTO quote_requests (public_reference, project_type, property_type, postcode, description, project_stage, budget_range, desired_start, contact_name, email, telephone, preferred_contact_method, privacy_consent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [publicReference, data.projectType, data.propertyType, data.postcode, data.description, data.stage, data.budget, data.start, data.contactName, data.email, data.phone, data.preferredContact, true],
      );
      for (const file of files) {
        await connection.execute('INSERT INTO quote_request_files (quote_request_id, stored_filename, original_filename, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [result.insertId, file.storedFilename, file.originalName, file.mimeType, file.size]);
      }
      await connection.commit();
      databaseStatus = 'connected';
    } catch (error) {
      await connection.rollback().catch(() => undefined);
      reportDatabaseFailure('Quote request and file records could not be stored atomically', error);
      throw new DatabaseUnavailableError();
    } finally {
      connection.release();
    }
  }
  const notification = await sendNotification({ kind: 'quote', reference: publicReference, name: data.contactName, email: data.email, summary: `${data.projectType} — ${data.postcode}` });
  if (pool) {
    try {
      await pool.execute('UPDATE quote_requests SET notification_status = ?, notification_error = ? WHERE public_reference = ?', [notification.status, notification.error || null, publicReference]);
    } catch (error) {
      reportDatabaseFailure('Quote notification status could not be updated after the quote was stored', error);
    }
  }
  return createdAt;
}

type StaffUser = { id: number; email: string; name: string; role: string };
const staffUnavailableMessage = 'The staff system is temporarily unavailable. Please contact the administrator.';
// Compared against when an email is unknown so login timing does not reveal which accounts exist.
const unknownUserHash = bcrypt.hashSync(crypto.randomBytes(18).toString('hex'), 12);

function sessionTokenHash(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function currentStaffUser(req: Request): Promise<StaffUser | null> {
  const token = req.cookies?.omni_staff_session as string | undefined;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  if (!pool) {
    if (productionMode || !localSessions.has(token) || (localSessions.get(token) || 0) < Date.now()) return null;
    return { id: 0, email: String(process.env.ADMIN_EMAIL || ''), name: 'Development administrator', role: 'owner' };
  }
  const tokenHash = sessionTokenHash(token);
  const [rows] = await pool.execute(
    "SELECT u.id, u.email, u.display_name AS name, u.role FROM staff_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() AND u.is_active = TRUE AND u.role IN ('owner','admin','staff') LIMIT 1",
    [tokenHash],
  );
  const user = (rows as StaffUser[])[0];
  if (!user) return null;
  await pool.execute('UPDATE staff_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ?', [tokenHash]);
  return user;
}

async function adminRequired(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies?.omni_staff_session) return res.status(401).json({ message: 'Staff authentication required.' });
  if (!pool && productionMode) return res.status(503).json({ message: 'Staff access has not been configured.' });
  try {
    const user = await currentStaffUser(req);
    if (!user) return res.status(401).json({ message: 'Staff authentication required.' });
    res.locals.staffUser = user;
    return next();
  } catch {
    return res.status(503).json({ message: staffUnavailableMessage });
  }
}

async function healthPayload() {
  let database: DatabaseStatus = pool ? databaseStatus : 'not-configured';
  if (pool) {
    try {
      if (productionMode) await verifyProductionDatabase();
      else await pool.query('SELECT 1');
      database = 'connected';
    } catch {
      database = 'unavailable';
    }
  }
  const degraded = productionMode && database !== 'connected';
  const payload: { status: string; service: string; timestamp: string; database?: string } = { status: degraded ? 'degraded' : 'ok', service: 'omni-development-site', timestamp: new Date().toISOString() };
  if (!stagingMode) payload.database = database;
  return { statusCode: degraded ? 503 : 200, payload };
}

app.get(['/health', '/api/health'], async (_req, res) => { const health = await healthPayload(); res.status(health.statusCode).json(health.payload); });

app.get('/api/site-settings', (_req, res) => res.json({ name: 'Omni Developments', area: 'Greater Manchester & Cheshire', phone: process.env.PUBLIC_PHONE || '07928 149 731', email: process.env.PUBLIC_EMAIL || 'admin@omnidevelopment.co.uk', whatsapp: process.env.PUBLIC_WHATSAPP || 'https://wa.me/447928149731', stagingMode, outboundMessagesEnabled, recaptchaSiteKey: recaptchaEnabled ? recaptchaSiteKey : '' }));

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
  const captchaError = await recaptchaFailure(req.body, req.ip);
  if (captchaError) return res.status(400).json({ message: captchaError });
  const publicReference = reference('ENQ');
  try { await verifyProductionDatabase(); await saveContact(parsed.data, publicReference); res.status(201).json({ reference: publicReference, message: 'Your enquiry has been received. We will follow up using the details you provided.' }); } catch (error) { next(error); }
});

app.post('/api/quote', quoteLimiter, upload.array('files', 8), async (req, res, next) => {
  const parsed = parseBody(quoteSchema, req.body);
  if (!parsed.data) return res.status(400).json({ message: parsed.message });
  const files = (req.files as Express.Multer.File[] | undefined) || [];
  if (files.some(file => !validMagic(file))) return res.status(400).json({ message: 'One or more uploads could not be verified as a supported file type.' });
  const captchaError = await recaptchaFailure(req.body, req.ip);
  if (captchaError) return res.status(400).json({ message: captchaError });
  const storedFiles: { storedFilename: string; originalName: string; mimeType: string; size: number }[] = [];
  try {
    await verifyProductionDatabase();
    if (files.length) await fs.mkdir(uploadRoot, { recursive: true });
    for (const file of files) {
      const storedFilename = `${crypto.randomUUID()}.${safeExtension(file)}`;
      await fs.writeFile(path.join(uploadRoot, storedFilename), file.buffer, { flag: 'wx' });
      storedFiles.push({ storedFilename, originalName: file.originalname.slice(0, 180), mimeType: file.mimetype, size: file.size });
    }
    const publicReference = reference('QTE');
    await saveQuote(parsed.data, publicReference, storedFiles);
    res.status(201).json({ reference: publicReference, message: 'Your quote request has been received.', files: storedFiles.map(file => file.originalName) });
  } catch (error) {
    await Promise.all(storedFiles.map(file => fs.unlink(path.join(uploadRoot, file.storedFilename)).catch(() => undefined)));
    next(error);
  }
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

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  let valid = false;
  let userId: number | null = null;
  if (pool) {
    try {
      await bootstrapAdministrator();
      const [adminRows] = await pool.execute("SELECT id FROM users WHERE role IN ('owner','admin') LIMIT 1");
      if (!(adminRows as Array<{ id: number }>).length) return res.status(503).json({ message: 'Staff access has not been configured.' });
      const [rows] = await pool.execute("SELECT id, password_hash FROM users WHERE email = ? AND is_active = TRUE AND role IN ('owner','admin','staff') LIMIT 1", [email]);
      const user = (rows as Array<{ id: number; password_hash: string }>)[0];
      userId = user?.id || null;
      const passwordMatches = await bcrypt.compare(password, user?.password_hash || unknownUserHash);
      valid = Boolean(user) && Boolean(password) && passwordMatches;
    } catch {
      return res.status(503).json({ message: staffUnavailableMessage });
    }
  } else {
    if (productionMode) return res.status(503).json({ message: 'Staff access has not been configured.' });
    const configuredEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const configuredHash = String(process.env.ADMIN_PASSWORD_HASH || '');
    if (!configuredEmail || !configuredHash) return res.status(503).json({ message: 'Staff access has not been configured.' });
    valid = email === configuredEmail && await bcrypt.compare(password, configuredHash);
  }
  if (!valid) {
    await auditAuthentication(userId, 'login_failed', email);
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  if (pool && userId) {
    try {
      await pool.execute('DELETE FROM staff_sessions WHERE expires_at <= UTC_TIMESTAMP() OR user_id = ?', [userId]);
      await pool.execute(
        'INSERT INTO staff_sessions (token_hash, user_id, expires_at, ip_hash, user_agent) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR), ?, ?)',
        [sessionTokenHash(token), userId, crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex'), String(req.get('user-agent') || '').slice(0, 255)],
      );
      await auditAuthentication(userId, 'login_succeeded', email);
    } catch {
      return res.status(503).json({ message: staffUnavailableMessage });
    }
  } else {
    localSessions.set(token, Date.now() + 8 * 60 * 60 * 1000);
  }
  res.cookie('omni_staff_session', token, { httpOnly: true, secure: secureCookie, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 });
  res.json({ authenticated: true });
});

app.get('/api/admin/summary', adminRequired, async (_req, res, next) => {
  try {
    if (!pool) return res.json({ contacts: localContacts.length, quotes: localQuotes.length, projects: localProjects.size, database: 'not-configured' });
    const [[contacts], [quotes], [projects]] = await Promise.all([
      pool.query('SELECT COUNT(*) AS count FROM contact_enquiries'),
      pool.query('SELECT COUNT(*) AS count FROM quote_requests'),
      pool.query("SELECT COUNT(*) AS count FROM projects WHERE publication_status <> 'archived'"),
    ]);
    return res.json({ contacts: Number((contacts as Array<{ count: number }>)[0]?.count || 0), quotes: Number((quotes as Array<{ count: number }>)[0]?.count || 0), projects: Number((projects as Array<{ count: number }>)[0]?.count || 0), database: 'configured' });
  } catch (error) { return next(error); }
});
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
app.get('/api/admin/leads', adminRequired, async (_req, res, next) => {
  try {
    if (!pool) return res.json({ records: localContacts });
    const [records] = await pool.query('SELECT id, public_reference AS reference, name, email, telephone AS phone, preferred_contact_method AS preferredContact, message, source_page AS source, created_at AS createdAt FROM contact_enquiries ORDER BY created_at DESC, id DESC LIMIT 250');
    return res.json({ records });
  } catch (error) { return next(error); }
});
app.get('/api/admin/quotes', adminRequired, async (_req, res, next) => {
  try {
    if (!pool) return res.json({ records: localQuotes });
    const [records] = await pool.query('SELECT q.id, q.public_reference AS reference, q.project_type AS projectType, q.property_type AS propertyType, q.postcode, q.description, q.project_stage AS stage, q.budget_range AS budget, q.desired_start AS desiredStart, q.contact_name AS contactName, q.email, q.telephone AS phone, q.preferred_contact_method AS preferredContact, q.created_at AS createdAt, COUNT(f.id) AS fileCount FROM quote_requests q LEFT JOIN quote_request_files f ON f.quote_request_id = q.id GROUP BY q.id ORDER BY q.created_at DESC, q.id DESC LIMIT 250');
    return res.json({ records });
  } catch (error) { return next(error); }
});
const crmReadRoutes = [
  ['/api/admin/site-visits', 'crm_site_visits', 'scheduled_at'],
  ['/api/admin/calendar', 'crm_calendar_events', 'starts_at'],
  ['/api/admin/tasks', 'crm_tasks', 'created_at'],
  ['/api/admin/invoices', 'crm_invoices', 'created_at'],
] as const;
for (const [route, table, order] of crmReadRoutes) app.get(route, adminRequired, async (_req, res, next) => {
  try {
    if (!pool) return res.json({ records: [] });
    const [records] = await pool.query(`SELECT * FROM \`${table}\` ORDER BY \`${order}\` DESC, id DESC LIMIT 250`);
    return res.json({ records });
  } catch (error) { return next(error); }
});
app.get('/api/admin/session', adminRequired, (_req, res) => {
  const user = res.locals.staffUser as StaffUser;
  res.set('Cache-Control', 'no-store').json({ authenticated: true, user: { name: user.name, email: user.email, role: user.role } });
});
// Logout never requires a live session: the cookie is always cleared and any matching server-side session destroyed.
app.post('/api/admin/logout', async (req, res) => {
  const token = req.cookies?.omni_staff_session as string | undefined;
  if (token && pool) {
    const user = await currentStaffUser(req).catch(() => null);
    await pool.execute('DELETE FROM staff_sessions WHERE token_hash = ?', [sessionTokenHash(token)]).catch(() => undefined);
    if (user) await auditAuthentication(user.id, 'logout', user.email);
  }
  if (token) localSessions.delete(token);
  res.clearCookie('omni_staff_session', { httpOnly: true, secure: secureCookie, sameSite: 'lax' });
  res.status(204).end();
});

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
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => { if (error instanceof multer.MulterError) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Each upload must be 8 MB or smaller.' : 'Upload could not be processed.' }); if (error instanceof DatabaseUnavailableError) return res.status(503).json({ message: error.message }); console.error(error); res.status(500).json({ message: 'The request could not be completed. Please try again.' }); });

async function startServer() {
  if (productionMode) {
    try {
      await verifyProductionDatabase();
      await bootstrapAdministrator();
    } catch (error) {
      if (!(error instanceof DatabaseUnavailableError)) reportDatabaseFailure('Administrator bootstrap could not be completed', error);
      console.error('[database] Server is starting in degraded mode. Public enquiries are disabled until MySQL and its schema are available.');
    }
  } else {
    try {
      await bootstrapAdministrator();
    } catch (error) {
      reportDatabaseFailure('Development administrator bootstrap could not be completed', error);
    }
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
