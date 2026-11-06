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
};
type LeadLink = { leadId: number | null; leadName: string; leadReference: string };
export type Visit = LeadLink & { id: number; scheduledAt: string | null; durationMinutes: number; address: string; status: 'scheduled' | 'completed' | 'cancelled'; notes: string; assignedUserId: number | null; assignedName: string };
export type Task = LeadLink & { id: number; title: string; notes: string; dueAt: string | null; status: 'open' | 'completed' | 'cancelled'; completedAt: string | null; assignedUserId: number | null; assignedName: string };
export type Quote = LeadLink & { id: number; reference: string; title: string; amountPence: number; status: 'draft' | 'sent' | 'accepted' | 'declined'; validUntil: string | null; notes: string; sentAt: string | null; decidedAt: string | null; createdAt: string | null };
export type Invoice = LeadLink & { id: number; reference: string; quoteId: number | null; customerName: string; amountPence: number; status: 'draft' | 'issued' | 'paid' | 'void'; dueAt: string | null; notes: string; issuedAt: string | null; paidAt: string | null; createdAt: string | null };
export type Activity = LeadLink & { id: number; kind: string; body: string; userName: string; createdAt: string | null };
export type StaffMember = { id: number; name: string; role: string };
export type LeadFile = { id: number; originalFilename: string; mimeType: string; sizeBytes: number; createdAt: string | null };
export type TeamRole = 'owner' | 'admin' | 'staff';
export const ROLE_LABELS: Record<TeamRole, string> = { owner: 'Owner', admin: 'Administrator', staff: 'Staff' };
export type TeamMember = { id: number; name: string; email: string; role: TeamRole; isActive: boolean; createdAt: string | null; lastSeenAt: string | null };
export type LeadDetail = { lead: Lead; activities: Activity[]; visits: Visit[]; tasks: Task[]; quotes: Quote[]; invoices: Invoice[]; files: LeadFile[] };
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
