import { useCallback, useEffect, useState } from 'react';

export type Stage = 'new' | 'contacted' | 'site_visit' | 'quoted' | 'won' | 'lost';
export const STAGES: Stage[] = ['new', 'contacted', 'site_visit', 'quoted', 'won', 'lost'];
export const STAGE_LABELS: Record<Stage, string> = { new: 'New', contacted: 'Contacted', site_visit: 'Site visit', quoted: 'Quoted', won: 'Won', lost: 'Lost' };
export const SOURCE_LABELS: Record<string, string> = { wordpress: 'Website form', website_contact: 'Contact form', website_quote: 'Quote form', manual: 'Added by staff' };

export type Lead = {
  id: number; reference: string; source: string; sourceDetail: string; name: string; email: string; phone: string; postcode: string; address: string;
  projectType: string; propertyType: string; budget: string; desiredStart: string; description: string; preferredContact: string;
  stage: Stage; lostReason: string; valuePence: number | null; assignedUserId: number | null; assignedName: string;
  stageChangedAt: string | null; createdAt: string | null; updatedAt: string | null; submission?: Record<string, unknown> | null;
  possibleDuplicates: Array<{ id: number; name: string; reference: string }>;
  /** Optional company the contact belongs to (contract v2). */
  companyName: string;
  contactType: ContactType;
};
export type ContactType = 'customer' | 'prospect' | 'supplier' | 'other';
export const CONTACT_TYPES: ContactType[] = ['customer', 'prospect', 'supplier', 'other'];
export const CONTACT_TYPE_LABELS: Record<ContactType, string> = { customer: 'Customer', prospect: 'Prospect', supplier: 'Supplier', other: 'Other' };
type LeadLink = { leadId: number | null; leadName: string; leadReference: string };
export type Visit = LeadLink & { id: number; scheduledAt: string | null; durationMinutes: number; address: string; status: 'scheduled' | 'completed' | 'cancelled'; notes: string; assignedUserId: number | null; assignedName: string };
export type Task = LeadLink & { id: number; title: string; notes: string; dueAt: string | null; status: 'open' | 'completed' | 'cancelled'; completedAt: string | null; assignedUserId: number | null; assignedName: string };
/** A priced line on a quote or invoice. On input `amountPence` is ignored; the server computes round(quantity × unitPricePence). */
export type LineItem = { id?: number; description: string; quantity: number; unitPricePence: number; amountPence: number };
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'amended';
export type Quote = LeadLink & {
  id: number; reference: string; title: string;
  /** Customer block printed on the PDF; defaults from the lead when created. */
  customerName: string; customerCompany: string; customerAddress: string; customerEmail: string;
  /** YYYY-MM-DD, defaults to today. */
  quoteDate: string | null;
  status: QuoteStatus;
  items: LineItem[]; subtotalPence: number; vatRatePercent: number; vatPence: number;
  /** Total including VAT (kept for the existing UI and dashboard). */
  amountPence: number;
  validUntil: string | null; notes: string; terms: string;
  version: number; parentQuoteId: number | null; revisedById: number | null;
  /** Set once emailed; null when amended/declined. */
  signingUrl: string | null;
  signedName: string; signedAt: string | null;
  sentAt: string | null; decidedAt: string | null; emailedAt: string | null; createdAt: string | null;
};
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void';
export type Invoice = LeadLink & {
  id: number; reference: string; quoteId: number | null;
  customerName: string; customerCompany: string; customerAddress: string; customerEmail: string;
  /** YYYY-MM-DD; defaults to today when issued. */
  invoiceDate: string | null;
  /** Optional tax point (YYYY-MM-DD). */
  supplyDate: string | null;
  poNumber: string; paymentTermsDays: number | null;
  status: InvoiceStatus;
  items: LineItem[]; subtotalPence: number; vatRatePercent: number; vatPence: number;
  /** Total including VAT. */
  amountPence: number;
  /** e.g. "Deposit" for a stage payment raised from a quote. */
  stageLabel: string;
  dueAt: string | null; notes: string; issuedAt: string | null; paidAt: string | null; sentAt: string | null; createdAt: string | null;
};
export type EmailStatus = 'queued' | 'sent' | 'failed' | 'received';
export type Email = LeadLink & {
  id: number; direction: 'outbound' | 'inbound';
  templateKey: string; relatedType: '' | 'quote' | 'invoice'; relatedId: number | null;
  from: string; to: string; subject: string;
  /** HTML. Never render it as markup — use htmlToText. */
  body: string;
  status: EmailStatus; error: string;
  sentAt: string | null; receivedAt: string | null; createdAt: string | null;
};
export type EmailTemplate = { key: string; name: string; subject: string; body: string; isActive: boolean; placeholders: string[] };
export type Followup = {
  id: number; documentType: 'quote' | 'invoice'; documentId: number; documentReference: string;
  leadId: number | null; leadName: string; templateKey: string;
  dueAt: string | null; status: 'pending' | 'sent' | 'cancelled'; attempts: number; maxAttempts: number; lastSentAt: string | null;
};
export type CompanySettings = {
  companyName: string; companyAddress: string; companyEmail: string; companyPhone: string; companyVatNumber: string;
  companyNumber: string; companyWebsite: string;
  bankAccountName: string; bankName: string; bankSortCode: string; bankAccountNumber: string;
  paymentTermsDays: number; defaultVatRatePercent: number; quoteTerms: string;
};
export type MailStatus = { outboundEnabled: boolean; smtpConfigured: boolean; imapConfigured: boolean; imapAvailable: boolean; cronConfigured: boolean };
/** Where a mail setting comes from: the server config file wins and cannot be changed in the CRM. */
export type SettingSource = 'config' | 'database' | 'default';
/** GET/PATCH /mail-settings (owner/admin). Passwords are write-only: PATCH `smtpPassword` / `imapPassword` ('' keeps the saved one). */
export type MailSettings = {
  outboundEnabled: boolean;
  smtpHost: string; smtpPort: number; smtpSecure: 'ssl' | 'tls' | 'none'; smtpUser: string; smtpPasswordSet: boolean;
  emailFrom: string; emailFromName: string; emailReplyTo: string;
  imapHost: string; imapPort: number; imapUser: string; imapPasswordSet: boolean; imapMailbox: string;
  signingBaseUrl: string;
  source: Record<string, SettingSource>;
};
export type MailSettingsInput = Partial<Omit<MailSettings, 'smtpPasswordSet' | 'imapPasswordSet' | 'source'>> & { smtpPassword?: string; imapPassword?: string };

/** Result of POST /mail-test and /imap-test: where the check stopped and why. */
export type MailTestResult = { ok: boolean; stage: 'config' | 'connect' | 'tls' | 'auth' | 'send' | 'done'; message: string };
export type SyncResult = { status: 'ok' | 'not-configured' | 'unavailable' | 'failed'; imported: number; message: string };
export type FollowupRunResult = { sent: number; failed: number; cancelled: number };
/** The customer-facing view of a quote served by the public signing API. */
export type SignDocument = {
  reference: string; title: string; version: number; status: QuoteStatus;
  customerName: string; items: LineItem[]; subtotalPence: number; vatRatePercent: number; vatPence: number; totalPence: number;
  validUntil: string | null; notes: string; terms: string; signedName: string; signedAt: string | null;
  company: { name: string; address: string; email: string; phone: string };
};
export type Activity = LeadLink & { id: number; kind: string; body: string; userName: string; createdAt: string | null };
export type StaffMember = { id: number; name: string; role: string };
export type LeadFile = { id: number; originalFilename: string; mimeType: string; sizeBytes: number; createdAt: string | null };
export type TeamRole = 'owner' | 'admin' | 'staff';
export const ROLE_LABELS: Record<TeamRole, string> = { owner: 'Owner', admin: 'Administrator', staff: 'Staff' };
export type TeamMember = { id: number; name: string; email: string; role: TeamRole; isActive: boolean; createdAt: string | null; lastSeenAt: string | null };
export type LeadDetail = { lead: Lead; activities: Activity[]; visits: Visit[]; tasks: Task[]; quotes: Quote[]; invoices: Invoice[]; files: LeadFile[]; emails: Email[] };
export type Summary = {
  stages: Record<Stage, number>; totalLeads: number; openLeads: number; newThisWeek: number; conversionRate: number | null; pipelineValuePence: number;
  quotesSentPence: number; quotesAcceptedPence: number; invoicesOutstandingPence: number; invoicesPaidPence: number; overdueInvoices: number;
  upcomingVisits: Visit[]; overdueTasks: number; openTasks: Task[]; openTaskCount: number; newLeads: Lead[]; recentActivity: Activity[];
};

export class CrmRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function crm<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/admin/crm${path}`, {
      method: init.method || 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json', ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new CrmRequestError(0, 'Could not reach the CRM. Check your connection and try again.');
  }
  const payload = await response.json().catch(() => ({})) as { message?: string };
  if (response.status === 401) {
    window.location.assign(`/staff/login`);
    throw new CrmRequestError(401, 'Your session has ended. Please sign in again.');
  }
  if (!response.ok) throw new CrmRequestError(response.status, payload.message || 'The request could not be completed. Please try again.');
  return payload as T;
}

/** Loads a CRM resource and exposes a reload; `path` null skips loading. */
export function useCrm<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(path));
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!path) return;
    let live = true;
    setLoading(true);
    setError('');
    crm<T>(path).then(result => { if (live) setData(result); }).catch(reason => { if (live) setError(reason instanceof Error ? reason.message : 'Could not load records.'); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [path, version]);
  const reload = useCallback(() => setVersion(value => value + 1), []);
  return { data, error, loading, reload, setData };
}

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
export const formatMoney = (pence: number | null | undefined) => (pence === null || pence === undefined ? '' : money.format(pence / 100));
export const formatWhen = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
export const formatDay = (value: string | null | undefined) => (value ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export function formatAgo(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return '';
  const minutes = Math.round((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDay(iso);
}

/** ISO instant → value for <input type="datetime-local"> in the browser's zone. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** <input type="datetime-local"> value (browser zone) → ISO instant, or null when empty. */
export const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

/** "£1,250.50" / "1250.5" → pence. Returns null for blank, NaN for invalid. */
export function parsePounds(value: string): number | null {
  const cleaned = value.replace(/[£,\s]/g, '');
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return Number.NaN;
  return Math.round(Number(cleaned) * 100);
}

export const penceToInput = (pence: number | null | undefined) => (pence === null || pence === undefined ? '' : (pence / 100).toFixed(2).replace(/\.00$/, ''));
/** 2048 → "2 KB", 3.5 MB → "3.5 MB". */
export const formatBytes = (bytes: number | null | undefined) => {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
};

/** YYYY-MM-DD + days → YYYY-MM-DD (calendar arithmetic, no time zones); '' when invalid. */
export function addDays(date: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(days)) return '';
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Today as YYYY-MM-DD in the browser zone. */
export function todayIso() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Lead address + postcode as a multi-line customer address. */
export const leadAddress = (lead: Pick<Lead, 'address' | 'postcode'>) => [lead.address, lead.postcode].map(part => (part || '').trim()).filter(Boolean).join('\n');

/** Line totals exactly as the server computes them (amount = round(qty × unit), VAT on the subtotal). */
export function lineTotals(items: Array<Pick<LineItem, 'quantity' | 'unitPricePence'>>, vatRatePercent: number) {
  const subtotalPence = items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPricePence), 0);
  const vatPence = Math.round(subtotalPence * (Number.isFinite(vatRatePercent) ? vatRatePercent : 0) / 100);
  return { subtotalPence, vatPence, totalPence: subtotalPence + vatPence };
}

/** 20 → "20%", 12.5 → "12.5%". */
export const formatPercent = (value: number | null | undefined) => (value === null || value === undefined || !Number.isFinite(value) ? '' : `${Number(value.toFixed(2))}%`);

/** 1 → "1", 2.5 → "2.5". */
export const formatQuantity = (value: number) => String(Number(value.toFixed(2)));

/** Email HTML → readable plain text without ever rendering or executing the markup. */
export function htmlToText(html: string) {
  if (!html) return '';
  const prepared = html.replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n');
  const text = typeof DOMParser !== 'undefined'
    ? new DOMParser().parseFromString(prepared, 'text/html').body.textContent || ''
    : prepared.replace(/<[^>]*>/g, '');
  return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Plain-English outcome of an email the server tried to send. */
export function emailOutcome(email: Pick<Email, 'status' | 'error' | 'to'>): { tone: 'success' | 'warning' | 'error'; message: string } {
  if (email.status === 'sent') return { tone: 'success', message: `Sent to ${email.to}.` };
  if (email.status === 'queued') return { tone: 'warning', message: email.error ? `Saved but not sent: ${email.error}` : 'Saved but not sent — email sending isn’t set up yet, so the message is waiting in the queue.' };
  if (email.status === 'failed') return { tone: 'error', message: email.error ? `Sending failed: ${email.error}` : 'Sending failed.' };
  return { tone: 'success', message: 'Received.' };
}
