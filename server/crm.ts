import crypto from 'node:crypto';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import express, { Request, RequestHandler, Response, Router } from 'express';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';

/*
 * Omni CRM: leads pipeline, activity history, site visits, tasks, quotes and invoices.
 *
 * Business rules live in this file once, on top of a deliberately thin storage layer
 * (MySQL in production, in-memory for local development without a database). The PHP
 * API in php/api/crm.php implements the same HTTP contract and the same rules.
 */

export const STAGES = ['new', 'contacted', 'site_visit', 'quoted', 'won', 'lost'] as const;
export type Stage = typeof STAGES[number];
const PIPELINE_ORDER: Stage[] = ['new', 'contacted', 'site_visit', 'quoted', 'won'];
export const STAGE_LABELS: Record<Stage, string> = { new: 'New', contacted: 'Contacted', site_visit: 'Site visit', quoted: 'Quoted', won: 'Won', lost: 'Lost' };

/** The stage a lead should move to when `target` happens, or null when it must stay put (never backwards, never out of won/lost). */
export function advancedStage(current: Stage, target: Stage): Stage | null {
  if (current === 'won' || current === 'lost') return null;
  return PIPELINE_ORDER.indexOf(target) > PIPELINE_ORDER.indexOf(current) ? target : null;
}

/** Signature the WordPress connector sends: hex HMAC-SHA256 of `${timestamp}.${rawBody}`. */
export function webhookSignature(secret: string, timestamp: string, rawBody: string) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

export function verifyWebhook(secret: string, timestamp: string, signature: string, rawBody: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!secret || secret.length < 32) return false;
  if (!/^\d{9,12}$/.test(timestamp) || Math.abs(nowSeconds - Number(timestamp)) > 300) return false;
  const provided = signature.replace(/^sha256=/, '');
  if (!/^[a-f0-9]{64}$/.test(provided)) return false;
  return crypto.timingSafeEqual(Buffer.from(webhookSignature(secret, timestamp, rawBody), 'hex'), Buffer.from(provided, 'hex'));
}

/** Maps a WordPress/Elementor submission's loosely named fields onto lead columns. */
export function mapWordPressFields(fields: Record<string, unknown>) {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    const text = Array.isArray(value) ? value.map(String).join(', ') : value === null || value === undefined ? '' : String(value);
    flat[key.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')] = text.trim();
  }
  const pick = (...keys: string[]) => keys.map(key => flat[key]).find(value => value) || '';
  const first = pick('first_name', 'firstname');
  const last = pick('last_name', 'lastname', 'surname');
  return {
    name: pick('name', 'full_name', 'your_name', 'contact_name') || [first, last].filter(Boolean).join(' '),
    email: pick('email', 'email_address', 'your_email'),
    phone: pick('phone', 'telephone', 'tel', 'mobile', 'phone_number'),
    postcode: pick('postcode', 'post_code', 'zip'),
    address: pick('address', 'property_address', 'site_address'),
    projectType: pick('project', 'project_type', 'service', 'services'),
    propertyType: pick('property', 'property_type'),
    budget: pick('budget', 'budget_range'),
    desiredStart: pick('start', 'desired_start', 'start_date', 'timescale'),
    description: pick('message', 'description', 'details', 'project_details', 'your_message'),
    preferredContact: pick('contact_pref', 'preferred_contact', 'contact_preference', 'contact_method'),
    plans: pick('plans', 'drawings', 'has_plans'),
  };
}

type Row = Record<string, unknown>;
export type TableName = 'crm_leads' | 'crm_lead_activities' | 'crm_site_visits' | 'crm_tasks' | 'crm_quotes' | 'crm_invoices';

const COLUMNS: Record<TableName, readonly string[]> = {
  crm_leads: ['public_reference', 'source', 'source_detail', 'external_id', 'contact_enquiry_id', 'quote_request_id', 'name', 'email', 'phone', 'postcode', 'address', 'project_type', 'property_type', 'budget', 'desired_start', 'description', 'preferred_contact', 'stage', 'lost_reason', 'estimated_value_pence', 'assigned_user_id', 'raw_payload', 'stage_changed_at', 'created_at'],
  crm_lead_activities: ['lead_id', 'user_id', 'kind', 'body'],
  crm_site_visits: ['lead_id', 'scheduled_at', 'address', 'duration_minutes', 'assigned_user_id', 'status', 'notes'],
  crm_tasks: ['lead_id', 'assigned_user_id', 'title', 'notes', 'due_at', 'status', 'completed_at'],
  crm_quotes: ['quote_reference', 'lead_id', 'title', 'amount_pence', 'status', 'valid_until', 'notes', 'sent_at', 'decided_at'],
  crm_invoices: ['lead_id', 'quote_id', 'invoice_reference', 'customer_name', 'amount_pence', 'status', 'due_at', 'notes', 'issued_at', 'paid_at'],
};

export type StaffMember = { id: number; name: string; role: string };

/** Staff account roles, matching the `users.role` enum in deploy/schema.sql. */
export const STAFF_ROLES = ['owner', 'admin', 'staff'] as const;
export type StaffRole = typeof STAFF_ROLES[number];
export const ROLE_LABELS: Record<StaffRole, string> = { owner: 'Owner', admin: 'Administrator', staff: 'Staff' };

/** A staff account as the team screen shows it: never includes the password hash. */
export type TeamMember = { id: number; name: string; email: string; role: StaffRole; isActive: boolean; createdAt: string | null; lastSeenAt: string | null };
export type TeamMemberPatch = { name?: string; email?: string; role?: StaffRole; isActive?: boolean; passwordHash?: string };
/** Who is making the request: resolved from the signed-in session by the router. */
/** A customer drawing attached to the website quote request behind a lead. */
export type LeadFile = { id: number; originalFilename: string; mimeType: string; sizeBytes: number; createdAt: string | null };
/** Storage row: adds the on-disk name, which never leaves the server. */
export type QuoteFileRecord = LeadFile & { storedFilename: string };

export type TeamActor = { id: number | null; role: string };

export type LocalEnquirySource = {
  contacts: () => Array<{ reference: string; name: string; email: string; phone: string; message: string; createdAt: string }>;
  quotes: () => Array<{ reference: string; projectType: string; contactName: string; email: string; createdAt: string }>;
};

export interface CrmStore {
  insert(table: TableName, row: Row): Promise<number>;
  update(table: TableName, id: number, patch: Row): Promise<boolean>;
  get(table: TableName, id: number): Promise<Row | null>;
  findBy(table: TableName, column: string, value: unknown): Promise<Row | null>;
  list(table: TableName, where?: Row, limit?: number): Promise<Row[]>;
  staff(): Promise<StaffMember[]>;
  syncWebsiteEnquiries(): Promise<void>;
  /** Every staff account, including deactivated ones (the team screen needs both). */
  team(): Promise<TeamMember[]>;
  insertUser(input: { email: string; name: string; role: StaffRole; passwordHash: string }): Promise<number>;
  updateUser(id: number, patch: TeamMemberPatch): Promise<boolean>;
  clearUserSessions(id: number): Promise<void>;
  /** Customer drawings uploaded with a website quote request. */
  quoteFiles(quoteRequestId: number): Promise<QuoteFileRecord[]>;
  quoteFile(quoteRequestId: number, fileId: number): Promise<QuoteFileRecord | null>;
  remove(table: TableName, id: number): Promise<boolean>;
}

function assertColumns(table: TableName, row: Row) {
  for (const key of Object.keys(row)) if (!COLUMNS[table].includes(key) && key !== 'id') throw new Error(`Unknown column ${table}.${key}`);
}

/** UTC 'YYYY-MM-DD HH:MM:SS', the format both MySQL and the in-memory store keep. */
export function sqlDateTime(date: Date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export class MysqlCrmStore implements CrmStore {
  constructor(private pool: Pool) {}

  async insert(table: TableName, row: Row) {
    assertColumns(table, row);
    const keys = Object.keys(row);
    const [result] = await this.pool.execute<ResultSetHeader>(
      `INSERT INTO \`${table}\` (${keys.map(key => `\`${key}\``).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
      keys.map(key => row[key] ?? null) as never[],
    );
    return result.insertId;
  }

  async update(table: TableName, id: number, patch: Row) {
    assertColumns(table, patch);
    const keys = Object.keys(patch);
    if (!keys.length) return true;
    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE \`${table}\` SET ${keys.map(key => `\`${key}\` = ?`).join(', ')} WHERE id = ?`,
      [...keys.map(key => patch[key] ?? null), id] as never[],
    );
    return result.affectedRows > 0;
  }

  async get(table: TableName, id: number) {
    const [rows] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
    return (rows[0] as Row | undefined) || null;
  }

  async findBy(table: TableName, column: string, value: unknown) {
    assertColumns(table, { [column]: value });
    const [rows] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM \`${table}\` WHERE \`${column}\` = ? LIMIT 1`, [value] as never[]);
    return (rows[0] as Row | undefined) || null;
  }

  async list(table: TableName, where: Row = {}, limit = 2000) {
    assertColumns(table, where);
    const keys = Object.keys(where);
    const clause = keys.length ? ` WHERE ${keys.map(key => `\`${key}\` = ?`).join(' AND ')}` : '';
    const [rows] = await this.pool.query<RowDataPacket[]>(`SELECT * FROM \`${table}\`${clause} ORDER BY id DESC LIMIT ${Math.max(1, Math.min(5000, Math.floor(limit)))}`, keys.map(key => where[key]));
    return rows as Row[];
  }

  async staff() {
    const [rows] = await this.pool.query<RowDataPacket[]>("SELECT id, display_name AS name, role FROM users WHERE is_active = TRUE AND role IN ('owner','admin','staff') ORDER BY display_name");
    return rows.map(row => ({ id: Number(row.id), name: String(row.name), role: String(row.role) }));
  }

  async team() {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT u.id, u.display_name AS name, u.email, u.role, u.is_active, u.created_at,
        (SELECT MAX(s.last_seen_at) FROM staff_sessions s WHERE s.user_id = u.id) AS last_seen_at
       FROM users u WHERE u.role IN ('owner','admin','staff') ORDER BY u.is_active DESC, u.display_name`,
    );
    return rows.map(row => teamMemberOut(row));
  }

  async insertUser(input: { email: string; name: string; role: StaffRole; passwordHash: string }) {
    const [result] = await this.pool.execute<ResultSetHeader>(
      "INSERT INTO users (email, password_hash, display_name, role, is_active) VALUES (?, ?, ?, ?, TRUE)",
      [input.email, input.passwordHash, input.name, input.role],
    );
    return result.insertId;
  }

  /** Only the columns in `TeamMemberPatch` can ever be written; the whitelist is fixed, never caller-supplied. */
  async updateUser(id: number, patch: TeamMemberPatch) {
    const columns: Row = {};
    if (patch.email !== undefined) columns.email = patch.email;
    if (patch.name !== undefined) columns.display_name = patch.name;
    if (patch.role !== undefined) columns.role = patch.role;
    if (patch.isActive !== undefined) columns.is_active = patch.isActive ? 1 : 0;
    if (patch.passwordHash !== undefined) columns.password_hash = patch.passwordHash;
    const keys = Object.keys(columns);
    if (!keys.length) return true;
    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE users SET ${keys.map(key => `\`${key}\` = ?`).join(', ')} WHERE id = ?`,
      [...keys.map(key => columns[key]), id] as never[],
    );
    return result.affectedRows > 0;
  }

  /** Deactivating or resetting a password must end every signed-in session for that account. */
  async clearUserSessions(id: number) {
    await this.pool.execute('DELETE FROM staff_sessions WHERE user_id = ?', [id]);
  }

  async quoteFiles(quoteRequestId: number) {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT id, stored_filename, original_filename, mime_type, size_bytes, created_at FROM quote_request_files WHERE quote_request_id = ? ORDER BY id',
      [quoteRequestId],
    );
    return rows.map(row => quoteFileOut(row));
  }

  /** Scoped by quote request so a file id from another lead can never be fetched. */
  async quoteFile(quoteRequestId: number, fileId: number) {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT id, stored_filename, original_filename, mime_type, size_bytes, created_at FROM quote_request_files WHERE id = ? AND quote_request_id = ? LIMIT 1',
      [fileId, quoteRequestId],
    );
    return rows[0] ? quoteFileOut(rows[0] as Row) : null;
  }

  /** Deleting a lead relies on the ON DELETE CASCADE rules in deploy/schema.sql for its children. */
  async remove(table: TableName, id: number) {
    const [result] = await this.pool.execute<ResultSetHeader>(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }

  /** Copies website enquiries that have no lead yet. Safe to run repeatedly and concurrently (unique source-id columns + INSERT IGNORE). */
  async syncWebsiteEnquiries() {
    await this.pool.query(`INSERT IGNORE INTO crm_leads (public_reference, source, source_detail, contact_enquiry_id, name, email, phone, description, preferred_contact, created_at)
      SELECT ce.public_reference, 'website_contact', ce.source_page, ce.id, ce.name, ce.email, ce.telephone, ce.message, ce.preferred_contact_method, ce.created_at
      FROM contact_enquiries ce LEFT JOIN crm_leads l ON l.contact_enquiry_id = ce.id WHERE l.id IS NULL`);
    await this.pool.query(`INSERT IGNORE INTO crm_leads (public_reference, source, source_detail, quote_request_id, name, email, phone, postcode, project_type, property_type, budget, desired_start, description, preferred_contact, created_at)
      SELECT q.public_reference, 'website_quote', q.project_stage, q.id, q.contact_name, q.email, q.telephone, q.postcode, q.project_type, q.property_type, q.budget_range, q.desired_start, q.description, q.preferred_contact_method, q.created_at
      FROM quote_requests q LEFT JOIN crm_leads l ON l.quote_request_id = q.id WHERE l.id IS NULL`);
  }
}

export class MemoryCrmStore implements CrmStore {
  private tables = new Map<TableName, Row[]>();
  private ids = new Map<TableName, number>();
  private users: Array<TeamMember & { passwordHash: string }> = [];
  private userIds = 0;
  constructor(private source?: LocalEnquirySource) {}

  private table(name: TableName) {
    if (!this.tables.has(name)) this.tables.set(name, []);
    return this.tables.get(name)!;
  }

  async insert(table: TableName, row: Row) {
    assertColumns(table, row);
    const unique = ['public_reference', 'external_id', 'quote_reference', 'invoice_reference', 'contact_enquiry_id', 'quote_request_id'];
    for (const key of unique) {
      if (row[key] !== undefined && row[key] !== null && this.table(table).some(existing => existing[key] === row[key])) {
        throw Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
      }
    }
    const id = (this.ids.get(table) || 0) + 1;
    this.ids.set(table, id);
    const now = sqlDateTime(new Date());
    const defaults: Partial<Record<TableName, Row>> = {
      crm_leads: { stage: 'new' }, crm_site_visits: { status: 'scheduled', duration_minutes: 60 }, crm_tasks: { status: 'open' },
      crm_quotes: { status: 'draft', amount_pence: 0 }, crm_invoices: { status: 'draft', amount_pence: 0 },
    };
    this.table(table).push({ ...defaults[table], created_at: now, ...row, id, updated_at: now });
    return id;
  }

  async update(table: TableName, id: number, patch: Row) {
    assertColumns(table, patch);
    const row = this.table(table).find(existing => existing.id === id);
    if (!row) return false;
    Object.assign(row, patch, { updated_at: sqlDateTime(new Date()) });
    return true;
  }

  async get(table: TableName, id: number) {
    const row = this.table(table).find(existing => existing.id === id);
    return row ? { ...row } : null;
  }

  async findBy(table: TableName, column: string, value: unknown) {
    const row = this.table(table).find(existing => existing[column] === value);
    return row ? { ...row } : null;
  }

  async list(table: TableName, where: Row = {}, limit = 2000) {
    return this.table(table)
      .filter(row => Object.entries(where).every(([key, value]) => row[key] === value))
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, limit)
      .map(row => ({ ...row }));
  }

  async staff() {
    const active = this.users.filter(member => member.isActive).map(member => ({ id: member.id, name: member.name, role: member.role }));
    return [{ id: 0, name: 'Development administrator', role: 'owner' }, ...active];
  }

  async team() {
    return this.users
      .slice()
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name))
      .map(member => ({ id: member.id, name: member.name, email: member.email, role: member.role, isActive: member.isActive, createdAt: member.createdAt, lastSeenAt: member.lastSeenAt }));
  }

  async insertUser(input: { email: string; name: string; role: StaffRole; passwordHash: string }) {
    if (this.users.some(member => member.email === input.email)) throw Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
    const id = ++this.userIds;
    this.users.push({ id, email: input.email, name: input.name, role: input.role, isActive: true, createdAt: sqlDateTime(new Date()), lastSeenAt: null, passwordHash: input.passwordHash });
    return id;
  }

  async updateUser(id: number, patch: TeamMemberPatch) {
    const member = this.users.find(existing => existing.id === id);
    if (!member) return false;
    if (patch.email !== undefined) member.email = patch.email;
    if (patch.name !== undefined) member.name = patch.name;
    if (patch.role !== undefined) member.role = patch.role;
    if (patch.isActive !== undefined) member.isActive = patch.isActive;
    if (patch.passwordHash !== undefined) member.passwordHash = patch.passwordHash;
    return true;
  }

  /** Local development keeps sessions in server.ts, so there are none to clear here. */
  async clearUserSessions(id: number) { void id; }

  /** Website quote uploads are not mirrored into the in-memory store. */
  async quoteFiles(quoteRequestId: number) { void quoteRequestId; return [] as QuoteFileRecord[]; }
  async quoteFile(quoteRequestId: number, fileId: number): Promise<QuoteFileRecord | null> { void quoteRequestId; void fileId; return null; }

  /** Mirrors the ON DELETE CASCADE rules so local development behaves like MySQL. */
  async remove(table: TableName, id: number) {
    const rows = this.table(table);
    const index = rows.findIndex(row => Number(row.id) === id);
    if (index === -1) return false;
    rows.splice(index, 1);
    if (table === 'crm_leads') {
      for (const child of ['crm_lead_activities', 'crm_site_visits', 'crm_tasks', 'crm_quotes'] as TableName[]) {
        this.tables.set(child, this.table(child).filter(row => Number(row.lead_id) !== id));
      }
    }
    return true;
  }

  async syncWebsiteEnquiries() {
    if (!this.source) return;
    const leads = this.table('crm_leads');
    const known = new Set(leads.map(lead => lead.public_reference));
    for (const contact of this.source.contacts()) {
      if (known.has(contact.reference)) continue;
      await this.insert('crm_leads', { public_reference: contact.reference, source: 'website_contact', name: contact.name, email: contact.email, phone: contact.phone, description: contact.message, created_at: sqlDateTime(new Date(contact.createdAt)) });
    }
    for (const quote of this.source.quotes()) {
      if (known.has(quote.reference)) continue;
      await this.insert('crm_leads', { public_reference: quote.reference, source: 'website_quote', name: quote.contactName, email: quote.email, project_type: quote.projectType, created_at: sqlDateTime(new Date(quote.createdAt)) });
    }
  }
}

/* ----------------------------------------------------------------------------
 * Row → API mapping
 * ------------------------------------------------------------------------- */

const text = (value: unknown) => (value === null || value === undefined ? '' : String(value));
const nullableNumber = (value: unknown) => (value === null || value === undefined || value === '' ? null : Number(value));

/** `quote_request_files` row → file record. The stored (on-disk) name stays server-side. */
function quoteFileOut(row: Row): QuoteFileRecord {
  return {
    id: Number(row.id),
    storedFilename: text(row.stored_filename),
    originalFilename: text(row.original_filename),
    mimeType: text(row.mime_type),
    sizeBytes: Number(row.size_bytes || 0),
    createdAt: isoDateTime(row.created_at),
  };
}

/** `users` row → team member. `is_active` comes back as 1/0 from MySQL and as a boolean from the memory store. */
function teamMemberOut(row: Row): TeamMember {
  return {
    id: Number(row.id),
    name: text(row.name),
    email: text(row.email),
    role: text(row.role) as StaffRole,
    isActive: row.is_active === true || Number(row.is_active) === 1,
    createdAt: isoDateTime(row.created_at),
    lastSeenAt: isoDateTime(row.last_seen_at),
  };
}

/** ISO-8601 for DATETIME/TIMESTAMP values, whether MySQL returned a Date or the memory store a UTC string. */
export function isoDateTime(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(String(value)) ? String(value) : `${String(value).replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** 'YYYY-MM-DD' for DATE columns. */
export function isoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

type Lookups = { staff: Map<number, string>; leads: Map<number, Row> };

function leadOut(row: Row, lookups: Pick<Lookups, 'staff'>) {
  const assignedUserId = nullableNumber(row.assigned_user_id);
  return {
    id: Number(row.id),
    reference: text(row.public_reference),
    source: text(row.source),
    sourceDetail: text(row.source_detail),
    name: text(row.name),
    email: text(row.email),
    phone: text(row.phone),
    postcode: text(row.postcode),
    address: text(row.address),
    projectType: text(row.project_type),
    propertyType: text(row.property_type),
    budget: text(row.budget),
    desiredStart: text(row.desired_start),
    description: text(row.description),
    preferredContact: text(row.preferred_contact),
    stage: text(row.stage) as Stage,
    lostReason: text(row.lost_reason),
    valuePence: nullableNumber(row.estimated_value_pence),
    assignedUserId,
    assignedName: assignedUserId === null ? '' : lookups.staff.get(assignedUserId) || '',
    stageChangedAt: isoDateTime(row.stage_changed_at),
    createdAt: isoDateTime(row.created_at),
    updatedAt: isoDateTime(row.updated_at),
    /** Filled in by listLeads/getLead: other leads with the same email address or phone number. */
    possibleDuplicates: [] as Array<{ id: number; name: string; reference: string }>,
  };
}
export type LeadOut = ReturnType<typeof leadOut>;

/** Digits only, with the UK country code collapsed: 07111 111111 and +44 7111 111111 are the same person. */
function normalisePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('44') ? `0${digits.slice(2)}` : digits;
}

/** The other leads that share this lead's email address or phone number. */
export function duplicateMatches(
  lead: Pick<LeadOut, 'id' | 'email' | 'phone'>,
  leads: Array<Pick<LeadOut, 'id' | 'email' | 'phone' | 'name' | 'reference'>>,
) {
  const email = lead.email.trim().toLowerCase();
  const phone = normalisePhone(lead.phone);
  return leads
    .filter(other => other.id !== lead.id && ((email !== '' && other.email.trim().toLowerCase() === email) || (phone.length >= 7 && normalisePhone(other.phone) === phone)))
    .map(other => ({ id: other.id, name: other.name, reference: other.reference }));
}

function leadLink(row: Row, lookups: Lookups) {
  const leadId = nullableNumber(row.lead_id);
  const lead = leadId === null ? undefined : lookups.leads.get(leadId);
  return { leadId, leadName: lead ? text(lead.name) : '', leadReference: lead ? text(lead.public_reference) : '' };
}

function visitOut(row: Row, lookups: Lookups) {
  const lead = leadLink(row, lookups);
  const assignedUserId = nullableNumber(row.assigned_user_id);
  return { id: Number(row.id), ...lead, scheduledAt: isoDateTime(row.scheduled_at), durationMinutes: Number(row.duration_minutes || 60), address: text(row.address) || (lead.leadId !== null ? text(lookups.leads.get(lead.leadId)?.postcode) : ''), status: text(row.status), notes: text(row.notes), assignedUserId, assignedName: assignedUserId === null ? '' : lookups.staff.get(assignedUserId) || '', createdAt: isoDateTime(row.created_at), updatedAt: isoDateTime(row.updated_at) };
}

function taskOut(row: Row, lookups: Lookups) {
  const assignedUserId = nullableNumber(row.assigned_user_id);
  return { id: Number(row.id), ...leadLink(row, lookups), title: text(row.title), notes: text(row.notes), dueAt: isoDateTime(row.due_at), status: text(row.status), completedAt: isoDateTime(row.completed_at), assignedUserId, assignedName: assignedUserId === null ? '' : lookups.staff.get(assignedUserId) || '', createdAt: isoDateTime(row.created_at), updatedAt: isoDateTime(row.updated_at) };
}

function quoteOut(row: Row, lookups: Lookups) {
  return { id: Number(row.id), reference: text(row.quote_reference), ...leadLink(row, lookups), title: text(row.title), amountPence: Number(row.amount_pence || 0), status: text(row.status), validUntil: isoDate(row.valid_until), notes: text(row.notes), sentAt: isoDateTime(row.sent_at), decidedAt: isoDateTime(row.decided_at), createdAt: isoDateTime(row.created_at), updatedAt: isoDateTime(row.updated_at) };
}

function invoiceOut(row: Row, lookups: Lookups) {
  return { id: Number(row.id), reference: text(row.invoice_reference), ...leadLink(row, lookups), quoteId: nullableNumber(row.quote_id), customerName: text(row.customer_name), amountPence: Number(row.amount_pence || 0), status: text(row.status), dueAt: isoDate(row.due_at), notes: text(row.notes), issuedAt: isoDateTime(row.issued_at), paidAt: isoDateTime(row.paid_at), createdAt: isoDateTime(row.created_at), updatedAt: isoDateTime(row.updated_at) };
}

function activityOut(row: Row, lookups: Lookups) {
  const userId = nullableNumber(row.user_id);
  return { id: Number(row.id), ...leadLink(row, lookups), kind: text(row.kind), body: text(row.body), userName: userId === null ? '' : lookups.staff.get(userId) || '', createdAt: isoDateTime(row.created_at) };
}

/* ----------------------------------------------------------------------------
 * Validation
 * ------------------------------------------------------------------------- */

const optionalText = (max: number) => z.string().trim().max(max).optional();
const nullableId = z.number().int().nonnegative().nullable().optional();
const pence = z.number().int().min(0).max(100_000_000_000);
const dateTimeInput = z.string().trim().refine(value => !Number.isNaN(Date.parse(value)), 'Enter a valid date and time.').transform(value => sqlDateTime(new Date(value)));
const dateInput = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date.');
const emailInput = z.union([z.literal(''), z.string().trim().toLowerCase().email('Enter a valid email address.').max(190)]).optional();

const leadFields = {
  name: z.string().trim().min(1, 'Enter the customer name.').max(120),
  email: emailInput,
  phone: optionalText(40),
  postcode: optionalText(20),
  address: optionalText(255),
  projectType: optionalText(120),
  propertyType: optionalText(120),
  budget: optionalText(100),
  desiredStart: optionalText(100),
  description: optionalText(8000),
  preferredContact: optionalText(40),
  valuePence: pence.nullable().optional(),
  assignedUserId: nullableId,
  stage: z.enum(STAGES).optional(),
  lostReason: optionalText(255),
};
const leadCreateSchema = z.object(leadFields).refine(value => Boolean(value.email || value.phone), { message: 'Add a phone number or email address.' });
const leadPatchSchema = z.object(leadFields).partial();
const activitySchema = z.object({ kind: z.enum(['note', 'call', 'email']).default('note'), body: z.string().trim().min(1, 'Write a note first.').max(5000) });
const visitSchema = z.object({ leadId: z.number().int().positive('Choose a lead.'), scheduledAt: dateTimeInput, durationMinutes: z.number().int().min(15).max(600).default(60), address: optionalText(255), notes: optionalText(5000), status: z.enum(['scheduled', 'completed', 'cancelled']).default('scheduled'), assignedUserId: nullableId });
const visitPatchSchema = z.object({ scheduledAt: dateTimeInput, durationMinutes: z.number().int().min(15).max(600), address: optionalText(255), notes: optionalText(5000), status: z.enum(['scheduled', 'completed', 'cancelled']), assignedUserId: nullableId }).partial();
const taskSchema = z.object({ leadId: z.number().int().positive().nullable().optional(), title: z.string().trim().min(1, 'Give the task a title.').max(190), notes: optionalText(5000), dueAt: dateTimeInput.nullable().optional(), status: z.enum(['open', 'completed', 'cancelled']).default('open'), assignedUserId: nullableId });
const taskPatchSchema = z.object({ title: z.string().trim().min(1).max(190), notes: optionalText(5000), dueAt: dateTimeInput.nullable(), status: z.enum(['open', 'completed', 'cancelled']), assignedUserId: nullableId }).partial();
const quoteSchema = z.object({ leadId: z.number().int().positive('Choose a lead.'), title: z.string().trim().min(1, 'Describe the quoted work.').max(190), amountPence: pence, status: z.enum(['draft', 'sent', 'accepted', 'declined']).default('draft'), validUntil: dateInput.nullable().optional(), notes: optionalText(8000) });
const quotePatchSchema = z.object({ title: z.string().trim().min(1).max(190), amountPence: pence, status: z.enum(['draft', 'sent', 'accepted', 'declined']), validUntil: dateInput.nullable(), notes: optionalText(8000) }).partial();
const invoiceSchema = z.object({ leadId: z.number().int().positive().nullable().optional(), quoteId: z.number().int().positive().nullable().optional(), customerName: optionalText(190), amountPence: pence, status: z.enum(['draft', 'issued', 'paid', 'void']).default('draft'), dueAt: dateInput.nullable().optional(), notes: optionalText(8000) });
const invoicePatchSchema = z.object({ customerName: z.string().trim().min(1).max(190), amountPence: pence, status: z.enum(['draft', 'issued', 'paid', 'void']), dueAt: dateInput.nullable(), notes: optionalText(8000) }).partial();
const passwordInput = z.string().min(12, 'Use at least 12 characters for the password.').max(200, 'The password is too long.');
const teamMemberSchema = z.object({
  name: z.string().trim().min(1, 'Enter the team member’s name.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(190),
  role: z.enum(STAFF_ROLES),
});
const teamCreateSchema = teamMemberSchema.extend({ role: z.enum(STAFF_ROLES).default('staff'), password: passwordInput });
const teamPatchSchema = teamMemberSchema.partial().extend({ isActive: z.boolean() }).partial();
const passwordResetSchema = z.object({ password: passwordInput });
const webhookSchema = z.object({
  externalId: z.string().trim().min(1).max(190),
  form: optionalText(190),
  page: optionalText(190),
  site: optionalText(190),
  submittedAt: z.string().optional(),
  fields: z.record(z.string(), z.unknown()),
});

export class CrmError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function parse<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body ?? {});
  if (!result.success) throw new CrmError(400, result.error.issues[0]?.message || 'Please check the details entered.');
  return result.data;
}

const blankToNull = (value: string | undefined) => (value === undefined ? undefined : value === '' ? null : value);
/** bcrypt rounds for staff passwords. Tests use a low cost so the suite stays quick; every other environment uses 12. */
const passwordHashCost = () => (process.env.NODE_ENV === 'test' ? 4 : 12);
const formatPounds = (amountPence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amountPence / 100);

/* ----------------------------------------------------------------------------
 * CSV (RFC 4180)
 * ------------------------------------------------------------------------- */

/** Quotes a cell only when it contains a comma, quote or newline. */
export function csvCell(value: unknown) {
  const cell = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

/** A UTF-8 BOM (so Excel reads accents correctly) and CRLF rows, as RFC 4180 asks. */
export function csvDocument(headers: string[], rows: unknown[][]) {
  return `\uFEFF${[headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

/** Pence → "1250.50" so spreadsheets treat the column as a number. */
const csvMoney = (pence: number | null | undefined) => ((Number(pence) || 0) / 100).toFixed(2);
const formatWhen = (value: string) => new Date(`${value.replace(' ', 'T')}Z`).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' });

/* ----------------------------------------------------------------------------
 * Service
 * ------------------------------------------------------------------------- */

export class CrmService {
  constructor(private store: CrmStore) {}

  private async lookups(): Promise<Lookups> {
    const [staff, leads] = await Promise.all([this.store.staff(), this.store.list('crm_leads')]);
    return { staff: new Map(staff.map(member => [member.id, member.name])), leads: new Map(leads.map(lead => [Number(lead.id), lead])) };
  }

  private async requireLead(id: number) {
    const lead = await this.store.get('crm_leads', id);
    if (!lead) throw new CrmError(404, 'Lead not found.');
    return lead;
  }

  private async validStaff(userId: number | null | undefined) {
    if (userId === undefined || userId === null) return userId;
    if (!(await this.store.staff()).some(member => member.id === userId)) throw new CrmError(400, 'Choose a member of staff from the list.');
    return userId;
  }

  async log(leadIdValue: number | null | undefined, kind: string, body: string, userId: number | null) {
    if (!leadIdValue) return;
    await this.store.insert('crm_lead_activities', { lead_id: leadIdValue, user_id: userId || null, kind, body });
  }

  /** Moves a lead's stage, recording the change. `force` allows any move (staff edits); otherwise only forward. */
  private async moveStage(lead: Row, target: Stage, userId: number | null, reason: string, force = false) {
    const current = text(lead.stage) as Stage;
    const next = force ? (current === target ? null : target) : advancedStage(current, target);
    if (!next) return;
    await this.store.update('crm_leads', Number(lead.id), { stage: next, stage_changed_at: sqlDateTime(new Date()) });
    await this.log(Number(lead.id), 'stage', `Stage changed from ${STAGE_LABELS[current] || current} to ${STAGE_LABELS[next]}${reason ? ` (${reason})` : ''}.`, userId);
  }

  async staff() { return this.store.staff(); }

  /* -- Team --------------------------------------------------------------- */

  /** Owners and administrators manage staff accounts; everyone else only reads the assignment list from /staff. */
  private assertManager(actor: TeamActor) {
    if (actor.role !== 'owner' && actor.role !== 'admin') throw new CrmError(403, 'Only owners and administrators can manage the team.');
  }

  private async requireMember(id: number) {
    const member = (await this.store.team()).find(candidate => candidate.id === id);
    if (!member) throw new CrmError(404, 'Team member not found.');
    return member;
  }

  async team(actor: TeamActor) {
    this.assertManager(actor);
    return this.store.team();
  }

  async createTeamMember(body: unknown, actor: TeamActor) {
    this.assertManager(actor);
    const input = parse(teamCreateSchema, body);
    if ((await this.store.team()).some(member => member.email === input.email)) throw new CrmError(409, 'A team member with this email address already exists.');
    const id = await this.store.insertUser({ email: input.email, name: input.name, role: input.role, passwordHash: await bcrypt.hash(input.password, passwordHashCost()) });
    return this.requireMember(id);
  }

  async updateTeamMember(id: number, body: unknown, actor: TeamActor) {
    this.assertManager(actor);
    const input = parse(teamPatchSchema, body);
    const members = await this.store.team();
    const target = members.find(member => member.id === id);
    if (!target) throw new CrmError(404, 'Team member not found.');
    const role = input.role ?? target.role;
    const isActive = input.isActive ?? target.isActive;
    if (actor.id === id && (role !== target.role || isActive !== target.isActive)) throw new CrmError(400, 'You cannot change your own role or deactivate your own access.');
    if (target.role === 'owner' && target.isActive && (role !== 'owner' || !isActive) && !members.some(member => member.id !== id && member.role === 'owner' && member.isActive)) {
      throw new CrmError(400, 'At least one owner must keep access. Promote another team member first.');
    }
    if (input.email !== undefined && input.email !== target.email && members.some(member => member.email === input.email)) throw new CrmError(409, 'A team member with this email address already exists.');
    const patch: TeamMemberPatch = { name: input.name, email: input.email, role: input.role, isActive: input.isActive };
    if (Object.values(patch).some(value => value !== undefined)) await this.store.updateUser(id, patch);
    // A deactivated account must not keep working through a session it already had.
    if (input.isActive === false && target.isActive) await this.store.clearUserSessions(id);
    return this.requireMember(id);
  }

  async resetTeamPassword(id: number, body: unknown, actor: TeamActor) {
    this.assertManager(actor);
    const input = parse(passwordResetSchema, body);
    await this.requireMember(id);
    await this.store.updateUser(id, { passwordHash: await bcrypt.hash(input.password, passwordHashCost()) });
    await this.store.clearUserSessions(id);
    return { id, sessionsCleared: true };
  }

  /* -- Exports and erasure ------------------------------------------------ */

  async exportLeads(filter: { stage?: string; q?: string }) {
    const leads = await this.listLeads(filter);
    return csvDocument(
      ['Reference', 'Name', 'Email', 'Phone', 'Postcode', 'Address', 'Project', 'Property', 'Budget', 'Desired start', 'Stage', 'Estimated value (GBP)', 'Assigned to', 'Source', 'Source detail', 'Created', 'Last updated'],
      leads.map(lead => [lead.reference, lead.name, lead.email, lead.phone, lead.postcode, lead.address, lead.projectType, lead.propertyType, lead.budget, lead.desiredStart, STAGE_LABELS[lead.stage as Stage] || lead.stage, csvMoney(lead.valuePence), lead.assignedName, lead.source, lead.sourceDetail, lead.createdAt, lead.updatedAt]),
    );
  }

  async exportInvoices(filter: { status?: string } = {}) {
    const invoices = await this.listInvoices(filter);
    return csvDocument(
      ['Invoice', 'Customer', 'Lead', 'Lead reference', 'Amount (GBP)', 'Status', 'Due', 'Issued', 'Paid', 'Notes'],
      invoices.map(invoice => [invoice.reference, invoice.customerName || invoice.leadName, invoice.leadName, invoice.leadReference, csvMoney(invoice.amountPence), invoice.status, invoice.dueAt, invoice.issuedAt, invoice.paidAt, invoice.notes]),
    );
  }

  /**
   * GDPR erasure. Personal data is removed either way; quotes and invoices stay when they exist,
   * because accounting records have to be kept.
   */
  async eraseLead(id: number, userId: number | null) {
    await this.requireLead(id);
    const [quotes, invoices, visits, tasks] = await Promise.all([
      this.store.list('crm_quotes', { lead_id: id }, 1),
      this.store.list('crm_invoices', { lead_id: id }, 1),
      this.store.list('crm_site_visits', { lead_id: id }, 200),
      this.store.list('crm_tasks', { lead_id: id }, 200),
    ]);
    if (!quotes.length && !invoices.length) {
      await this.store.remove('crm_leads', id);
      return { id, erased: 'deleted' as const };
    }
    await this.store.update('crm_leads', id, {
      name: 'Personal data erased', email: null, phone: null, postcode: null, address: null, project_type: null, property_type: null,
      budget: null, desired_start: null, description: null, preferred_contact: null, lost_reason: null, raw_payload: null,
    });
    for (const visit of visits) await this.store.update('crm_site_visits', Number(visit.id), { address: null, notes: null });
    for (const task of tasks) if (text(task.notes)) await this.store.update('crm_tasks', Number(task.id), { notes: null });
    await this.log(id, 'system', 'Personal data erased at the customer’s request. Quotes and invoices were kept for accounting.', userId);
    return { id, erased: 'anonymised' as const };
  }

  async listLeads(filter: { stage?: string; q?: string }) {
    await this.store.syncWebsiteEnquiries();
    const lookups = await this.lookups();
    const needle = (filter.q || '').trim().toLowerCase();
    // Duplicates are looked for across every lead, not just the filtered view.
    const all = [...lookups.leads.values()].map(row => leadOut(row, lookups));
    return all
      .filter(lead => !filter.stage || lead.stage === filter.stage)
      .filter(lead => !needle || [lead.name, lead.email, lead.phone, lead.postcode, lead.reference, lead.projectType, lead.address].join(' ').toLowerCase().includes(needle))
      .map(lead => ({ ...lead, possibleDuplicates: duplicateMatches(lead, all) }))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || b.id - a.id);
  }

  async getLead(id: number) {
    await this.store.syncWebsiteEnquiries();
    const lookups = await this.lookups();
    const row = lookups.leads.get(id);
    if (!row) throw new CrmError(404, 'Lead not found.');
    const quoteRequestId = nullableNumber(row.quote_request_id);
    const [activities, visits, tasks, quotes, invoices, files] = await Promise.all([
      this.store.list('crm_lead_activities', { lead_id: id }, 500),
      this.store.list('crm_site_visits', { lead_id: id }, 200),
      this.store.list('crm_tasks', { lead_id: id }, 200),
      this.store.list('crm_quotes', { lead_id: id }, 200),
      this.store.list('crm_invoices', { lead_id: id }, 200),
      quoteRequestId === null ? Promise.resolve<QuoteFileRecord[]>([]) : this.store.quoteFiles(quoteRequestId),
    ]);
    let raw: unknown = null;
    try { raw = row.raw_payload ? (typeof row.raw_payload === 'string' ? JSON.parse(row.raw_payload) : row.raw_payload) : null; } catch { raw = null; }
    const lead = leadOut(row, lookups);
    const others = [...lookups.leads.values()].map(other => leadOut(other, lookups));
    return {
      lead: { ...lead, possibleDuplicates: duplicateMatches(lead, others), submission: raw && typeof raw === 'object' && 'fields' in raw ? (raw as { fields: unknown }).fields : null },
      activities: activities.map(activity => activityOut(activity, lookups)),
      visits: visits.map(visit => visitOut(visit, lookups)),
      tasks: tasks.map(task => taskOut(task, lookups)),
      quotes: quotes.map(quote => quoteOut(quote, lookups)),
      invoices: invoices.map(invoice => invoiceOut(invoice, lookups)),
      files: files.map(file => ({ id: file.id, originalFilename: file.originalFilename, mimeType: file.mimeType, sizeBytes: file.sizeBytes, createdAt: file.createdAt })),
    };
  }

  /** One attachment for download, always scoped through the lead's own quote request. */
  async leadFile(leadId: number, fileId: number) {
    const lead = await this.store.get('crm_leads', leadId);
    if (!lead) throw new CrmError(404, 'Lead not found.');
    const quoteRequestId = nullableNumber(lead.quote_request_id);
    const file = quoteRequestId === null ? null : await this.store.quoteFile(quoteRequestId, fileId);
    if (!file) throw new CrmError(404, 'File not found.');
    return file;
  }

  private leadColumns(input: Partial<z.infer<typeof leadPatchSchema>>) {
    const row: Row = {};
    const map: Array<[keyof typeof input, string]> = [['name', 'name'], ['email', 'email'], ['phone', 'phone'], ['postcode', 'postcode'], ['address', 'address'], ['projectType', 'project_type'], ['propertyType', 'property_type'], ['budget', 'budget'], ['desiredStart', 'desired_start'], ['description', 'description'], ['preferredContact', 'preferred_contact'], ['lostReason', 'lost_reason']];
    for (const [key, column] of map) if (input[key] !== undefined) row[column] = key === 'name' ? input[key] : blankToNull(input[key] as string);
    if (input.valuePence !== undefined) row.estimated_value_pence = input.valuePence;
    if (input.assignedUserId !== undefined) row.assigned_user_id = input.assignedUserId;
    return row;
  }

  async createLead(body: unknown, userId: number | null) {
    const input = parse(leadCreateSchema, body);
    await this.validStaff(input.assignedUserId);
    const id = await this.store.insert('crm_leads', { ...this.leadColumns(input), public_reference: `LEAD-${crypto.randomBytes(5).toString('hex').toUpperCase()}`, source: 'manual', stage: input.stage || 'new', stage_changed_at: sqlDateTime(new Date()) });
    await this.log(id, 'system', 'Lead added by staff.', userId);
    return (await this.getLead(id)).lead;
  }

  async updateLead(id: number, body: unknown, userId: number | null) {
    const lead = await this.requireLead(id);
    const input = parse(leadPatchSchema, body);
    await this.validStaff(input.assignedUserId);
    const columns = this.leadColumns(input);
    if (Object.keys(columns).length) await this.store.update('crm_leads', id, columns);
    if (input.assignedUserId !== undefined && nullableNumber(lead.assigned_user_id) !== input.assignedUserId) {
      const name = input.assignedUserId === null ? '' : (await this.store.staff()).find(member => member.id === input.assignedUserId)?.name || '';
      await this.log(id, 'system', name ? `Assigned to ${name}.` : 'Unassigned.', userId);
    }
    if (input.stage && input.stage !== lead.stage) await this.moveStage(lead, input.stage, userId, input.stage === 'lost' && input.lostReason ? input.lostReason : '', true);
    return (await this.getLead(id)).lead;
  }

  async addActivity(id: number, body: unknown, userId: number | null) {
    await this.requireLead(id);
    const input = parse(activitySchema, body);
    await this.log(id, input.kind, input.body, userId);
    const lead = await this.requireLead(id);
    // Logging a call or email to a brand-new lead means it has been contacted.
    if (input.kind !== 'note') await this.moveStage(lead, 'contacted', userId, `${input.kind} logged`);
    return (await this.getLead(id)).activities;
  }

  /* -- site visits ------------------------------------------------------ */
  async listVisits(filter: { status?: string }) {
    const lookups = await this.lookups();
    const rows = await this.store.list('crm_site_visits', filter.status ? { status: filter.status } : {});
    return rows.map(row => visitOut(row, lookups)).sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)));
  }

  async createVisit(body: unknown, userId: number | null) {
    const input = parse(visitSchema, body);
    const lead = await this.requireLead(input.leadId);
    await this.validStaff(input.assignedUserId);
    const id = await this.store.insert('crm_site_visits', { lead_id: input.leadId, scheduled_at: input.scheduledAt, duration_minutes: input.durationMinutes, address: blankToNull(input.address) ?? (text(lead.address) || null), notes: blankToNull(input.notes) ?? null, status: input.status, assigned_user_id: input.assignedUserId ?? null });
    await this.log(input.leadId, 'visit', `Site visit booked for ${formatWhen(input.scheduledAt)}.`, userId);
    await this.moveStage(lead, 'site_visit', userId, 'site visit booked');
    return visitOut((await this.store.get('crm_site_visits', id))!, await this.lookups());
  }

  async updateVisit(id: number, body: unknown, userId: number | null) {
    const visit = await this.store.get('crm_site_visits', id);
    if (!visit) throw new CrmError(404, 'Site visit not found.');
    const input = parse(visitPatchSchema, body);
    await this.validStaff(input.assignedUserId);
    const patch: Row = {};
    if (input.scheduledAt !== undefined) patch.scheduled_at = input.scheduledAt;
    if (input.durationMinutes !== undefined) patch.duration_minutes = input.durationMinutes;
    if (input.address !== undefined) patch.address = blankToNull(input.address);
    if (input.notes !== undefined) patch.notes = blankToNull(input.notes);
    if (input.status !== undefined) patch.status = input.status;
    if (input.assignedUserId !== undefined) patch.assigned_user_id = input.assignedUserId;
    await this.store.update('crm_site_visits', id, patch);
    const leadIdValue = nullableNumber(visit.lead_id);
    if (input.status && input.status !== visit.status) await this.log(leadIdValue, 'visit', input.status === 'completed' ? 'Site visit completed.' : input.status === 'cancelled' ? 'Site visit cancelled.' : 'Site visit re-scheduled.', userId);
    else if (input.scheduledAt && input.scheduledAt !== sqlDateTime(new Date(isoDateTime(visit.scheduled_at) || 0))) await this.log(leadIdValue, 'visit', `Site visit moved to ${formatWhen(input.scheduledAt)}.`, userId);
    return visitOut((await this.store.get('crm_site_visits', id))!, await this.lookups());
  }

  /* -- tasks ------------------------------------------------------------ */
  async listTasks(filter: { status?: string }) {
    const lookups = await this.lookups();
    const rows = await this.store.list('crm_tasks', filter.status ? { status: filter.status } : {});
    return rows.map(row => taskOut(row, lookups)).sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || String(a.dueAt || '9999').localeCompare(String(b.dueAt || '9999')) || b.id - a.id);
  }

  async createTask(body: unknown, userId: number | null) {
    const input = parse(taskSchema, body);
    if (input.leadId) await this.requireLead(input.leadId);
    await this.validStaff(input.assignedUserId);
    const id = await this.store.insert('crm_tasks', { lead_id: input.leadId ?? null, title: input.title, notes: blankToNull(input.notes) ?? null, due_at: input.dueAt ?? null, status: input.status, completed_at: input.status === 'completed' ? sqlDateTime(new Date()) : null, assigned_user_id: input.assignedUserId ?? null });
    await this.log(input.leadId, 'task', `Task added: ${input.title}.`, userId);
    return taskOut((await this.store.get('crm_tasks', id))!, await this.lookups());
  }

  async updateTask(id: number, body: unknown, userId: number | null) {
    const task = await this.store.get('crm_tasks', id);
    if (!task) throw new CrmError(404, 'Task not found.');
    const input = parse(taskPatchSchema, body);
    await this.validStaff(input.assignedUserId);
    const patch: Row = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.notes !== undefined) patch.notes = blankToNull(input.notes);
    if (input.dueAt !== undefined) patch.due_at = input.dueAt;
    if (input.assignedUserId !== undefined) patch.assigned_user_id = input.assignedUserId;
    if (input.status !== undefined) {
      patch.status = input.status;
      patch.completed_at = input.status === 'completed' ? (task.completed_at ? task.completed_at : sqlDateTime(new Date())) : null;
    }
    await this.store.update('crm_tasks', id, patch);
    if (input.status && input.status !== task.status) await this.log(nullableNumber(task.lead_id), 'task', `Task ${input.status === 'completed' ? 'completed' : input.status === 'cancelled' ? 'cancelled' : 're-opened'}: ${text(input.title ?? task.title)}.`, userId);
    return taskOut((await this.store.get('crm_tasks', id))!, await this.lookups());
  }

  /* -- quotes ----------------------------------------------------------- */
  async listQuotes(filter: { status?: string }) {
    const lookups = await this.lookups();
    return (await this.store.list('crm_quotes', filter.status ? { status: filter.status } : {})).map(row => quoteOut(row, lookups));
  }

  private async quoteStatusEffects(quote: Row, status: string, userId: number | null) {
    const lead = await this.requireLead(Number(quote.lead_id));
    const label = `${text(quote.quote_reference)} (${formatPounds(Number(quote.amount_pence || 0))})`;
    if (status === 'sent') {
      await this.log(Number(lead.id), 'quote', `Quote ${label} sent.`, userId);
      await this.moveStage(lead, 'quoted', userId, 'quote sent');
    } else if (status === 'accepted') {
      await this.log(Number(lead.id), 'quote', `Quote ${label} accepted.`, userId);
      await this.moveStage(lead, 'won', userId, 'quote accepted', lead.stage !== 'won');
    } else if (status === 'declined') {
      await this.log(Number(lead.id), 'quote', `Quote ${label} declined.`, userId);
    }
  }

  async createQuote(body: unknown, userId: number | null) {
    const input = parse(quoteSchema, body);
    await this.requireLead(input.leadId);
    const now = sqlDateTime(new Date());
    const id = await this.store.insert('crm_quotes', { quote_reference: `TMP-${crypto.randomBytes(8).toString('hex')}`, lead_id: input.leadId, title: input.title, amount_pence: input.amountPence, status: input.status, valid_until: input.validUntil ?? null, notes: blankToNull(input.notes) ?? null, sent_at: input.status !== 'draft' ? now : null, decided_at: ['accepted', 'declined'].includes(input.status) ? now : null });
    await this.store.update('crm_quotes', id, { quote_reference: `Q-${String(id).padStart(4, '0')}` });
    const quote = (await this.store.get('crm_quotes', id))!;
    await this.log(input.leadId, 'quote', `Quote ${text(quote.quote_reference)} created: ${input.title} (${formatPounds(input.amountPence)}).`, userId);
    if (input.status !== 'draft') await this.quoteStatusEffects(quote, input.status, userId);
    return quoteOut((await this.store.get('crm_quotes', id))!, await this.lookups());
  }

  async updateQuote(id: number, body: unknown, userId: number | null) {
    const quote = await this.store.get('crm_quotes', id);
    if (!quote) throw new CrmError(404, 'Quote not found.');
    const input = parse(quotePatchSchema, body);
    const patch: Row = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.amountPence !== undefined) patch.amount_pence = input.amountPence;
    if (input.validUntil !== undefined) patch.valid_until = input.validUntil;
    if (input.notes !== undefined) patch.notes = blankToNull(input.notes);
    const statusChanged = input.status !== undefined && input.status !== quote.status;
    if (statusChanged) {
      patch.status = input.status;
      const now = sqlDateTime(new Date());
      if (input.status === 'sent' && !quote.sent_at) patch.sent_at = now;
      if (input.status === 'accepted' || input.status === 'declined') patch.decided_at = now;
      if (input.status === 'draft') { patch.sent_at = null; patch.decided_at = null; }
    }
    await this.store.update('crm_quotes', id, patch);
    const updated = (await this.store.get('crm_quotes', id))!;
    if (statusChanged) await this.quoteStatusEffects(updated, String(input.status), userId);
    return quoteOut(updated, await this.lookups());
  }

  /* -- invoices --------------------------------------------------------- */
  async listInvoices(filter: { status?: string }) {
    const lookups = await this.lookups();
    return (await this.store.list('crm_invoices', filter.status ? { status: filter.status } : {})).map(row => invoiceOut(row, lookups));
  }

  async createInvoice(body: unknown, userId: number | null) {
    const input = parse(invoiceSchema, body);
    let leadIdValue = input.leadId ?? null;
    if (input.quoteId) {
      const quote = await this.store.get('crm_quotes', input.quoteId);
      if (!quote) throw new CrmError(400, 'That quote no longer exists.');
      leadIdValue = leadIdValue ?? Number(quote.lead_id);
      if (Number(quote.lead_id) !== leadIdValue) throw new CrmError(400, 'The quote belongs to a different lead.');
    }
    const lead = leadIdValue ? await this.requireLead(leadIdValue) : null;
    const customerName = input.customerName || (lead ? text(lead.name) : '');
    if (!customerName) throw new CrmError(400, 'Choose a lead or enter the customer name.');
    const now = sqlDateTime(new Date());
    const id = await this.store.insert('crm_invoices', { invoice_reference: `TMP-${crypto.randomBytes(8).toString('hex')}`, lead_id: leadIdValue, quote_id: input.quoteId ?? null, customer_name: customerName, amount_pence: input.amountPence, status: input.status, due_at: input.dueAt ?? null, notes: blankToNull(input.notes) ?? null, issued_at: ['issued', 'paid'].includes(input.status) ? now : null, paid_at: input.status === 'paid' ? now : null });
    await this.store.update('crm_invoices', id, { invoice_reference: `INV-${String(id).padStart(4, '0')}` });
    await this.log(leadIdValue, 'invoice', `Invoice INV-${String(id).padStart(4, '0')} ${input.status === 'draft' ? 'drafted' : input.status} for ${formatPounds(input.amountPence)}.`, userId);
    return invoiceOut((await this.store.get('crm_invoices', id))!, await this.lookups());
  }

  async updateInvoice(id: number, body: unknown, userId: number | null) {
    const invoice = await this.store.get('crm_invoices', id);
    if (!invoice) throw new CrmError(404, 'Invoice not found.');
    const input = parse(invoicePatchSchema, body);
    const patch: Row = {};
    if (input.customerName !== undefined) patch.customer_name = input.customerName;
    if (input.amountPence !== undefined) patch.amount_pence = input.amountPence;
    if (input.dueAt !== undefined) patch.due_at = input.dueAt;
    if (input.notes !== undefined) patch.notes = blankToNull(input.notes);
    const statusChanged = input.status !== undefined && input.status !== invoice.status;
    if (statusChanged) {
      const now = sqlDateTime(new Date());
      patch.status = input.status;
      if ((input.status === 'issued' || input.status === 'paid') && !invoice.issued_at) patch.issued_at = now;
      patch.paid_at = input.status === 'paid' ? (invoice.paid_at || now) : null;
      if (input.status === 'draft') patch.issued_at = null;
    }
    await this.store.update('crm_invoices', id, patch);
    const updated = (await this.store.get('crm_invoices', id))!;
    if (statusChanged) await this.log(nullableNumber(updated.lead_id), 'invoice', `Invoice ${text(updated.invoice_reference)} marked ${input.status} (${formatPounds(Number(updated.amount_pence || 0))}).`, userId);
    return invoiceOut(updated, await this.lookups());
  }

  /* -- dashboard -------------------------------------------------------- */
  async summary(now = new Date()) {
    await this.store.syncWebsiteEnquiries();
    const lookups = await this.lookups();
    const [visits, tasks, quotes, invoices, activities] = await Promise.all([
      this.store.list('crm_site_visits'), this.store.list('crm_tasks', { status: 'open' }), this.store.list('crm_quotes'), this.store.list('crm_invoices'), this.store.list('crm_lead_activities', {}, 12),
    ]);
    const leads = [...lookups.leads.values()];
    const stages = Object.fromEntries(STAGES.map(stage => [stage, leads.filter(lead => lead.stage === stage).length])) as Record<Stage, number>;
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const today = now.toISOString().slice(0, 10);
    const closed = stages.won + stages.lost;
    const sum = (rows: Row[]) => rows.reduce((total, row) => total + Number(row.amount_pence || 0), 0);
    const openTasks = tasks.map(task => taskOut(task, lookups)).sort((a, b) => String(a.dueAt || '9999').localeCompare(String(b.dueAt || '9999')));
    return {
      stages,
      totalLeads: leads.length,
      openLeads: leads.filter(lead => lead.stage !== 'won' && lead.stage !== 'lost').length,
      newThisWeek: leads.filter(lead => new Date(isoDateTime(lead.created_at) || 0).getTime() >= weekAgo).length,
      conversionRate: closed ? Math.round((stages.won / closed) * 100) : null,
      pipelineValuePence: leads.filter(lead => lead.stage !== 'won' && lead.stage !== 'lost').reduce((total, lead) => total + Number(lead.estimated_value_pence || 0), 0),
      quotesSentPence: sum(quotes.filter(quote => quote.status === 'sent')),
      quotesAcceptedPence: sum(quotes.filter(quote => quote.status === 'accepted')),
      invoicesOutstandingPence: sum(invoices.filter(invoice => invoice.status === 'issued')),
      invoicesPaidPence: sum(invoices.filter(invoice => invoice.status === 'paid')),
      overdueInvoices: invoices.filter(invoice => invoice.status === 'issued' && isoDate(invoice.due_at) && String(isoDate(invoice.due_at)) < today).length,
      upcomingVisits: visits.filter(visit => visit.status === 'scheduled' && new Date(isoDateTime(visit.scheduled_at) || 0).getTime() >= now.getTime() - 60 * 60 * 1000).map(visit => visitOut(visit, lookups)).sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt))).slice(0, 6),
      overdueTasks: openTasks.filter(task => task.dueAt && new Date(task.dueAt).getTime() < now.getTime()).length,
      openTasks: openTasks.slice(0, 8),
      openTaskCount: openTasks.length,
      newLeads: leads.filter(lead => lead.stage === 'new').map(lead => leadOut(lead, lookups)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 6),
      recentActivity: activities.map(activity => activityOut(activity, lookups)),
    };
  }

  /* -- WordPress ingestion -------------------------------------------------- */
  async ingestWordPress(body: unknown) {
    const input = parse(webhookSchema, body);
    const existing = await this.store.findBy('crm_leads', 'external_id', input.externalId);
    if (existing) return { created: false, reference: text(existing.public_reference) };
    const fields = mapWordPressFields(input.fields);
    if (!fields.name && !fields.email && !fields.phone) throw new CrmError(400, 'The submission has no name, email or phone number.');
    const submitted = input.submittedAt && !Number.isNaN(Date.parse(input.submittedAt)) ? new Date(input.submittedAt) : new Date();
    const description = [fields.description, fields.plans && `Plans/drawings: ${fields.plans}`].filter(Boolean).join('\n\n');
    const reference = `WP-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const clip = (value: string, max: number) => (value ? value.slice(0, max) : null);
    try {
      const id = await this.store.insert('crm_leads', {
        public_reference: reference, source: 'wordpress', source_detail: clip([input.form, input.page].filter(Boolean).join(' · '), 190), external_id: input.externalId,
        name: clip(fields.name, 120) || clip(fields.email, 120) || clip(fields.phone, 120), email: clip(fields.email.toLowerCase(), 190), phone: clip(fields.phone, 40), postcode: clip(fields.postcode.toUpperCase(), 20), address: clip(fields.address, 255),
        project_type: clip(fields.projectType, 120), property_type: clip(fields.propertyType, 120), budget: clip(fields.budget, 100), desired_start: clip(fields.desiredStart, 100), description: clip(description, 8000),
        preferred_contact: clip(fields.preferredContact, 40), raw_payload: JSON.stringify({ form: input.form, page: input.page, site: input.site, fields: input.fields }), created_at: sqlDateTime(submitted),
      });
      await this.log(id, 'system', `Lead received from the website form${input.form ? ` “${input.form}”` : ''}${input.page ? ` on ${input.page}` : ''}.`, null);
      return { created: true, reference };
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
        const duplicate = await this.store.findBy('crm_leads', 'external_id', input.externalId);
        if (duplicate) return { created: false, reference: text(duplicate.public_reference) };
      }
      throw error;
    }
  }
}

/* ----------------------------------------------------------------------------
 * HTTP
 * ------------------------------------------------------------------------- */

type Handler = (req: Request, res: Response) => Promise<unknown>;
const staffId = (res: Response) => { const id = Number((res.locals.staffUser as { id?: number } | undefined)?.id); return Number.isInteger(id) && id > 0 ? id : null; };
/** The signed-in staff member behind a request, for the team endpoints' role checks. */
const staffActor = (res: Response): TeamActor => { const user = res.locals.staffUser as { id?: number; role?: string } | undefined; const id = Number(user?.id); return { id: Number.isInteger(id) && id > 0 ? id : null, role: String(user?.role || '') }; };
const idParam = (req: Request) => { const id = Number(req.params.id); if (!Number.isInteger(id) || id < 1) throw new CrmError(400, 'Invalid record id.'); return id; };
const fileIdParam = (req: Request) => { const id = Number(req.params.fileId); if (!Number.isInteger(id) || id < 1) throw new CrmError(400, 'Invalid file id.'); return id; };
/** Types the public quote form accepts, so nothing else is ever served as an attachment. */
const DOWNLOAD_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const queryText = (value: unknown) => (typeof value === 'string' ? value.slice(0, 120) : undefined);

function wrap(handler: Handler): RequestHandler {
  return (req, res, next) => {
    handler(req, res).then(payload => { if (!res.headersSent) res.set('Cache-Control', 'no-store').json(payload); }).catch(error => {
      if (error instanceof CrmError) return res.status(error.status).json({ message: error.message });
      return next(error);
    });
  };
}

export function createCrmRouter(service: () => CrmService | null, uploadRoot: () => string) {
  const router = Router();
  const use = () => { const crm = service(); if (!crm) throw new CrmError(503, 'The CRM needs its database. Please contact the administrator.'); return crm; };
  router.get('/summary', wrap(async () => use().summary()));
  const sendCsv = (res: Response, filename: string, body: string) => {
    res.set('Cache-Control', 'no-store').set('X-Content-Type-Options', 'nosniff');
    res.type('text/csv; charset=utf-8');
    res.attachment(filename);
    return res.send(body);
  };
  const csvName = (kind: string) => `omni-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
  router.get('/leads.csv', async (req, res, next) => {
    try { return sendCsv(res, csvName('leads'), await use().exportLeads({ stage: queryText(req.query.stage), q: queryText(req.query.q) })); }
    catch (error) { if (error instanceof CrmError) return res.status(error.status).json({ message: error.message }); return next(error); }
  });
  router.get('/invoices.csv', async (req, res, next) => {
    try { return sendCsv(res, csvName('invoices'), await use().exportInvoices({ status: queryText(req.query.status) })); }
    catch (error) { if (error instanceof CrmError) return res.status(error.status).json({ message: error.message }); return next(error); }
  });
  router.get('/staff', wrap(async () => ({ staff: await use().staff() })));
  router.get('/team', wrap(async (_req, res) => ({ team: await use().team(staffActor(res)) })));
  router.post('/team', wrap(async (req, res) => { res.status(201); return { member: await use().createTeamMember(req.body, staffActor(res)) }; }));
  router.patch('/team/:id', wrap(async (req, res) => ({ member: await use().updateTeamMember(idParam(req), req.body, staffActor(res)) })));
  router.post('/team/:id/password', wrap(async (req, res) => ({ reset: await use().resetTeamPassword(idParam(req), req.body, staffActor(res)) })));
  router.get('/leads', wrap(async req => ({ records: await use().listLeads({ stage: queryText(req.query.stage), q: queryText(req.query.q) }) })));
  router.post('/leads', wrap(async (req, res) => { res.status(201); return { lead: await use().createLead(req.body, staffId(res)) }; }));
  router.get('/leads/:id', wrap(async req => use().getLead(idParam(req))));
  router.get('/leads/:id/files/:fileId', async (req, res, next) => {
    try {
      const file = await use().leadFile(idParam(req), fileIdParam(req));
      const directory = path.resolve(uploadRoot());
      const absolute = path.resolve(directory, path.basename(file.storedFilename));
      if (!absolute.startsWith(`${directory}${path.sep}`)) throw new CrmError(404, 'File not found.');
      res.set('Cache-Control', 'no-store').set('X-Content-Type-Options', 'nosniff');
      res.type(DOWNLOAD_TYPES.has(file.mimeType) ? file.mimeType : 'application/octet-stream');
      res.attachment(file.originalFilename || 'attachment');
      res.sendFile(absolute, error => {
        if (!error) return;
        if (res.headersSent) return next(error);
        return res.status(404).json({ message: 'The file is no longer available.' });
      });
    } catch (error) {
      if (error instanceof CrmError) return res.status(error.status).json({ message: error.message });
      return next(error);
    }
  });
  router.patch('/leads/:id', wrap(async (req, res) => ({ lead: await use().updateLead(idParam(req), req.body, staffId(res)) })));
  router.delete('/leads/:id', wrap(async (req, res) => ({ result: await use().eraseLead(idParam(req), staffId(res)) })));
  router.post('/leads/:id/activities', wrap(async (req, res) => { res.status(201); return { activities: await use().addActivity(idParam(req), req.body, staffId(res)) }; }));
  const resources = [
    ['visits', 'listVisits', 'createVisit', 'updateVisit', 'visit'],
    ['tasks', 'listTasks', 'createTask', 'updateTask', 'task'],
    ['quotes', 'listQuotes', 'createQuote', 'updateQuote', 'quote'],
    ['invoices', 'listInvoices', 'createInvoice', 'updateInvoice', 'invoice'],
  ] as const;
  for (const [path, list, create, update, key] of resources) {
    router.get(`/${path}`, wrap(async req => ({ records: await use()[list]({ status: queryText(req.query.status) }) })));
    router.post(`/${path}`, wrap(async (req, res) => { res.status(201); return { [key]: await use()[create](req.body, staffId(res)) }; }));
    router.patch(`/${path}/:id`, wrap(async (req, res) => ({ [key]: await use()[update](idParam(req), req.body, staffId(res)) })));
  }
  return router;
}

export function createWordPressWebhook(service: () => CrmService | null, secret: () => string): RequestHandler[] {
  return [express.text({ type: '*/*', limit: '200kb' }), wrap(async (req, res) => {
    const configured = secret();
    if (!configured || configured.length < 32) throw new CrmError(503, 'The CRM webhook has not been configured.');
    const rawBody = typeof req.body === 'string' ? req.body : '';
    if (!verifyWebhook(configured, String(req.get('x-omni-timestamp') || ''), String(req.get('x-omni-signature') || ''), rawBody)) throw new CrmError(401, 'Signature check failed.');
    let body: unknown;
    try { body = JSON.parse(rawBody); } catch { throw new CrmError(400, 'Body must be JSON.'); }
    const crm = service();
    if (!crm) throw new CrmError(503, 'The CRM needs its database.');
    const result = await crm.ingestWordPress(body);
    res.status(result.created ? 201 : 200);
    return result;
  })];
}
