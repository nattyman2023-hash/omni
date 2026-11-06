import crypto from 'node:crypto';
import type { Pool, ResultSetHeader } from 'mysql2/promise';
import { sendEmail, fromAddress } from './emailService';
import { renderTemplate, renderPlainTemplate, wrapEmailHtml, toPlainText, findDefaultTemplate } from './templates';
import { renderDocumentPdf, type CompanyDetails, type PdfLineItem } from './pdfService';
import { fetchInboundEmails, imapConfigured } from './mailboxService';

type QueryValue = string | number | boolean | null;

export type ContactRow = {
  id: number;
  reference: string;
  contact_name: string;
  company_name: string | null;
  email: string | null;
  telephone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  is_lead: number;
  contact_type: string;
  lead_stage: string;
  source: string | null;
  owner_user_id: number | null;
  notes: string | null;
  tags: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContactInput = {
  contactName: string;
  companyName?: string;
  email?: string;
  telephone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
  country?: string;
  isLead?: boolean;
  contactType?: string;
  leadStage?: string;
  source?: string;
  notes?: string;
  tags?: string;
};

export type QuoteItemInput = { description: string; quantity: number; unitPricePence: number };
export type QuoteInput = {
  contactId: number;
  title: string;
  description?: string;
  issueDate?: string;
  validUntil?: string;
  vatRate?: number;
  discountPence?: number;
  terms?: string;
  notes?: string;
  items: QuoteItemInput[];
};
export type InvoiceInput = {
  contactId?: number | null;
  quoteId?: number | null;
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  title?: string;
  description?: string;
  vatRate?: number;
  discountPence?: number;
  issueDate?: string;
  dueAt?: string;
  paymentTerms?: string;
  notes?: string;
  items: QuoteItemInput[];
};

export type Totals = { subtotalPence: number; vatPence: number; totalPence: number };

function money(pence: number): string {
  const value = (Math.round(pence) / 100).toFixed(2);
  return `£${value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}
export { money as formatPence };

function todayIso(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function selectRows<T>(pool: Pool, sql: string, params: QueryValue[] = []): Promise<T[]> {
  const [rows] = await pool.execute(sql, params as never[]);
  return rows as T[];
}

async function selectOne<T>(pool: Pool, sql: string, params: QueryValue[] = []): Promise<T | undefined> {
  const rows = await selectRows<T>(pool, sql, params);
  return rows[0];
}

async function mutate(pool: Pool, sql: string, params: QueryValue[] = []): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params as never[]);
  return result;
}

export function computeTotals(items: QuoteItemInput[], vatRate = 0, discountPence = 0): Totals {
  const subtotalPence = items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPricePence), 0);
  const afterDiscount = Math.max(0, subtotalPence - Math.max(0, Math.round(discountPence)));
  const vatPence = Math.round((afterDiscount * vatRate) / 100);
  return { subtotalPence, vatPence, totalPence: afterDiscount + vatPence };
}

export type CompanySettings = CompanyDetails & { paymentTermsDays: number };

export async function loadCompanySettings(pool: Pool): Promise<CompanySettings> {
  const records = await selectRows<{ setting_key: string; setting_value: string }>(
    pool,
    "SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('company_name','company_address','company_email','company_phone','bank_name','bank_account_name','bank_sort_code','bank_account_number','invoice_payment_terms_days')",
  ).catch(() => []);
  const map = new Map(records.map(record => [record.setting_key, record.setting_value]));
  const value = (key: string, fallback: string) => map.get(key) || fallback;
  return {
    name: value('company_name', 'Omni Developments Ltd'),
    address: value('company_address', '68 Woodham Road, Manchester, M23 0NS'),
    email: value('company_email', 'admin@omnidevelopment.co.uk'),
    phone: value('company_phone', '07928 149 731'),
    bankName: value('bank_name', 'NatWest'),
    bankAccountName: value('bank_account_name', 'Omni Developments Manchester Limited'),
    bankSortCode: value('bank_sort_code', '60-15-25'),
    bankAccountNumber: value('bank_account_number', '65714946'),
    paymentTermsDays: Number(value('invoice_payment_terms_days', '7')) || 7,
  };
}

export function paymentDetailsText(company: CompanySettings): string {
  return `${company.bankName} | Account name: ${company.bankAccountName} | Sort code: ${company.bankSortCode} | Account number: ${company.bankAccountNumber}`;
}

const CONTACT_COLUMNS = 'id, reference, contact_name, company_name, email, telephone, address_line1, address_line2, city, postcode, country, is_lead, contact_type, lead_stage, source, owner_user_id, notes, tags, last_contacted_at, created_at, updated_at';

export async function listContacts(pool: Pool, filter: { type?: string; lead?: boolean; search?: string } = {}): Promise<ContactRow[]> {
  const where: string[] = [];
  const params: QueryValue[] = [];
  if (filter.type) { where.push('contact_type = ?'); params.push(filter.type); }
  if (typeof filter.lead === 'boolean') { where.push('is_lead = ?'); params.push(filter.lead ? 1 : 0); }
  if (filter.search) {
    where.push('(contact_name LIKE ? OR company_name LIKE ? OR email LIKE ?)');
    const like = `%${filter.search}%`;
    params.push(like, like, like);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return selectRows<ContactRow>(pool, `SELECT ${CONTACT_COLUMNS} FROM crm_contacts ${clause} ORDER BY created_at DESC, id DESC LIMIT 500`, params);
}

export async function getContact(pool: Pool, id: number): Promise<ContactRow | undefined> {
  return selectOne<ContactRow>(pool, `SELECT ${CONTACT_COLUMNS} FROM crm_contacts WHERE id = ?`, [id]);
}

export async function createContact(pool: Pool, input: ContactInput, userId: number | null): Promise<ContactRow> {
  const reference = `CON-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const result = await mutate(
    pool,
    'INSERT INTO crm_contacts (reference, contact_name, company_name, email, telephone, address_line1, address_line2, city, postcode, country, is_lead, contact_type, lead_stage, source, owner_user_id, notes, tags, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())',
    [reference, input.contactName, input.companyName || null, input.email || null, input.telephone || null, input.addressLine1 || null, input.addressLine2 || null, input.city || null, input.postcode || null, input.country || 'United Kingdom', input.isLead === false ? 0 : 1, input.contactType || 'lead', input.leadStage || 'new', input.source || null, userId ?? null, input.notes || null, input.tags || null],
  );
  const contact = await getContact(pool, result.insertId);
  if (!contact) throw new Error('The contact could not be reloaded after it was created.');
  return contact;
}

export async function updateContact(pool: Pool, id: number, input: Partial<ContactInput>): Promise<ContactRow | undefined> {
  const fields: string[] = [];
  const params: QueryValue[] = [];
  const columns: [keyof ContactInput, string][] = [
    ['contactName', 'contact_name'], ['companyName', 'company_name'], ['email', 'email'], ['telephone', 'telephone'],
    ['addressLine1', 'address_line1'], ['addressLine2', 'address_line2'], ['city', 'city'], ['postcode', 'postcode'],
    ['country', 'country'], ['contactType', 'contact_type'], ['leadStage', 'lead_stage'], ['source', 'source'],
    ['notes', 'notes'], ['tags', 'tags'],
  ];
  for (const [key, column] of columns) {
    const value = input[key];
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      params.push((value as string) || null);
    }
  }
  if (input.isLead !== undefined) {
    fields.push('is_lead = ?');
    params.push(input.isLead ? 1 : 0);
  }
  if (!fields.length) return getContact(pool, id);
  params.push(id);
  await mutate(pool, `UPDATE crm_contacts SET ${fields.join(', ')} WHERE id = ?`, params);
  return getContact(pool, id);
}

export async function deleteContact(pool: Pool, id: number): Promise<boolean> {
  const result = await mutate(pool, 'DELETE FROM crm_contacts WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function touchContact(pool: Pool, id: number): Promise<void> {
  await mutate(pool, 'UPDATE crm_contacts SET last_contacted_at = NOW() WHERE id = ?', [id]).catch(() => undefined);
}

export async function findOrCreateContact(pool: Pool, input: { name: string; email?: string; phone?: string; source?: string; isLead?: boolean }): Promise<ContactRow> {
  if (input.email) {
    const existing = await selectOne<ContactRow>(pool, `SELECT ${CONTACT_COLUMNS} FROM crm_contacts WHERE email = ? LIMIT 1`, [input.email]);
    if (existing) return existing;
  }
  return createContact(pool, { contactName: input.name, email: input.email, telephone: input.phone, source: input.source, isLead: input.isLead ?? true }, null);
}

export type QuoteRow = {
  id: number;
  quote_reference: string;
  contact_id: number;
  parent_quote_id: number | null;
  version: number;
  title: string;
  description: string | null;
  status: string;
  issue_date: string | null;
  valid_until: string | null;
  subtotal_pence: number;
  vat_rate: string | number;
  vat_pence: number;
  discount_pence: number;
  total_pence: number;
  terms: string | null;
  notes: string | null;
  sign_token: string | null;
  sign_status: string;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  signer_name: string | null;
  signer_email: string | null;
  signer_ip: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteItemRow = {
  id: number;
  quote_id: number;
  description: string;
  quantity: string | number;
  unit_price_pence: number;
  amount_pence: number;
  sort_order: number;
};

async function replaceQuoteItems(pool: Pool, quoteId: number, items: QuoteItemInput[]): Promise<void> {
  await mutate(pool, 'DELETE FROM crm_quote_items WHERE quote_id = ?', [quoteId]);
  let sortOrder = 0;
  for (const item of items) {
    const amount = Math.round(item.quantity * item.unitPricePence);
    await mutate(pool, 'INSERT INTO crm_quote_items (quote_id, description, quantity, unit_price_pence, amount_pence, sort_order) VALUES (?,?,?,?,?,?)', [quoteId, item.description, item.quantity, item.unitPricePence, amount, sortOrder++]);
  }
}

export async function listQuotes(pool: Pool): Promise<(QuoteRow & { contact_name: string | null; contact_email: string | null; item_count: number })[]> {
  return selectRows(pool, 'SELECT q.*, c.contact_name, c.email AS contact_email, (SELECT COUNT(*) FROM crm_quote_items i WHERE i.quote_id = q.id) AS item_count FROM crm_quotes q LEFT JOIN crm_contacts c ON c.id = q.contact_id ORDER BY q.created_at DESC, q.id DESC LIMIT 500');
}

export async function getQuote(pool: Pool, id: number): Promise<{ quote: QuoteRow; items: QuoteItemRow[]; contact: ContactRow | undefined } | undefined> {
  const quote = await selectOne<QuoteRow>(pool, 'SELECT * FROM crm_quotes WHERE id = ?', [id]);
  if (!quote) return undefined;
  const items = await selectRows<QuoteItemRow>(pool, 'SELECT * FROM crm_quote_items WHERE quote_id = ? ORDER BY sort_order, id', [id]);
  const contact = await getContact(pool, quote.contact_id);
  return { quote, items, contact };
}

export async function createQuote(pool: Pool, input: QuoteInput, userId: number | null): Promise<QuoteRow> {
  const vatRate = input.vatRate ?? 0;
  const discountPence = input.discountPence ?? 0;
  const totals = computeTotals(input.items, vatRate, discountPence);
  const reference = `QT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const result = await mutate(
    pool,
    'INSERT INTO crm_quotes (quote_reference, contact_id, version, title, description, status, issue_date, valid_until, subtotal_pence, vat_rate, vat_pence, discount_pence, total_pence, terms, notes, created_by_user_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())',
    [reference, input.contactId, 1, input.title, input.description || null, 'draft', input.issueDate || todayIso(), input.validUntil || todayIso(30), totals.subtotalPence, vatRate, totals.vatPence, discountPence, totals.totalPence, input.terms || null, input.notes || null, userId ?? null],
  );
  await replaceQuoteItems(pool, result.insertId, input.items);
  const quote = await selectOne<QuoteRow>(pool, 'SELECT * FROM crm_quotes WHERE id = ?', [result.insertId]);
  if (!quote) throw new Error('The quote could not be reloaded after it was created.');
  return quote;
}

export async function updateQuote(pool: Pool, id: number, input: QuoteInput): Promise<QuoteRow | undefined> {
  const existing = await selectOne<QuoteRow>(pool, 'SELECT * FROM crm_quotes WHERE id = ?', [id]);
  if (!existing) return undefined;
  const vatRate = input.vatRate ?? 0;
  const discountPence = input.discountPence ?? 0;
  const totals = computeTotals(input.items, vatRate, discountPence);
  await mutate(
    pool,
    'UPDATE crm_quotes SET contact_id = ?, title = ?, description = ?, issue_date = ?, valid_until = ?, subtotal_pence = ?, vat_rate = ?, vat_pence = ?, discount_pence = ?, total_pence = ?, terms = ?, notes = ? WHERE id = ?',
    [input.contactId, input.title, input.description || null, input.issueDate || existing.issue_date || todayIso(), input.validUntil || existing.valid_until || todayIso(30), totals.subtotalPence, vatRate, totals.vatPence, discountPence, totals.totalPence, input.terms || null, input.notes || null, id],
  );
  await replaceQuoteItems(pool, id, input.items);
  return selectOne<QuoteRow>(pool, 'SELECT * FROM crm_quotes WHERE id = ?', [id]);
}

export async function setQuoteStatus(pool: Pool, id: number, status: string): Promise<void> {
  await mutate(pool, 'UPDATE crm_quotes SET status = ? WHERE id = ?', [status, id]);
}

/**
 * Create a revision (amendment) of an existing quote/contract. The original is
 * retained and marked "amended"; the new version links back via parent_quote_id.
 */
export async function reviseQuote(pool: Pool, id: number, userId: number | null): Promise<QuoteRow | undefined> {
  const source = await getQuote(pool, id);
  if (!source) return undefined;
  await setQuoteStatus(pool, id, 'amended');
  const items: QuoteItemInput[] = source.items.map(item => ({ description: item.description, quantity: Number(item.quantity), unitPricePence: item.unit_price_pence }));
  const version = source.quote.version + 1;
  const reference = `${source.quote.quote_reference}-R${version}`;
  const vatRate = Number(source.quote.vat_rate);
  const totals = computeTotals(items, vatRate, source.quote.discount_pence);
  const result = await mutate(
    pool,
    'INSERT INTO crm_quotes (quote_reference, contact_id, parent_quote_id, version, title, description, status, issue_date, valid_until, subtotal_pence, vat_rate, vat_pence, discount_pence, total_pence, terms, notes, created_by_user_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())',
    [reference, source.quote.contact_id, id, version, source.quote.title, source.quote.description, 'draft', todayIso(), todayIso(30), totals.subtotalPence, vatRate, totals.vatPence, source.quote.discount_pence, totals.totalPence, source.quote.terms, source.quote.notes, userId ?? null],
  );
  await replaceQuoteItems(pool, result.insertId, items);
  return selectOne<QuoteRow>(pool, 'SELECT * FROM crm_quotes WHERE id = ?', [result.insertId]);
}

export async function getQuoteByToken(pool: Pool, token: string): Promise<{ quote: QuoteRow; items: QuoteItemRow[]; contact: ContactRow | undefined } | undefined> {
  if (!/^[a-f0-9]{24,64}$/i.test(token)) return undefined;
  const quote = await selectOne<QuoteRow>(pool, 'SELECT * FROM crm_quotes WHERE sign_token = ?', [token]);
  if (!quote) return undefined;
  const items = await selectRows<QuoteItemRow>(pool, 'SELECT * FROM crm_quote_items WHERE quote_id = ? ORDER BY sort_order, id', [quote.id]);
  const contact = await getContact(pool, quote.contact_id);
  return { quote, items, contact };
}

export async function markQuoteViewed(pool: Pool, token: string): Promise<void> {
  await mutate(pool, "UPDATE crm_quotes SET viewed_at = COALESCE(viewed_at, NOW()), sign_status = CASE WHEN sign_status = 'awaiting' THEN 'viewed' ELSE sign_status END, status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END WHERE sign_token = ?", [token]).catch(() => undefined);
}

export type SignResult =
  | { status: 'not-found' }
  | { status: 'already-signed'; quote: QuoteRow }
  | { status: 'signed'; quote: QuoteRow };

export async function signQuote(pool: Pool, token: string, signer: { name: string; email: string; ip?: string }): Promise<SignResult> {
  const quote = await selectOne<QuoteRow>(pool, 'SELECT * FROM crm_quotes WHERE sign_token = ?', [token]);
  if (!quote) return { status: 'not-found' };
  if (quote.sign_status === 'signed') return { status: 'already-signed', quote };
  await mutate(
    pool,
    "UPDATE crm_quotes SET sign_status = 'signed', status = 'accepted', signed_at = NOW(), accepted_at = NOW(), signer_name = ?, signer_email = ?, signer_ip = ?, viewed_at = COALESCE(viewed_at, NOW()) WHERE id = ?",
    [signer.name, signer.email, signer.ip || null, quote.id],
  );
  await cancelFollowups(pool, 'quote', quote.id);
  await touchContact(pool, quote.contact_id);
  return { status: 'signed', quote: { ...quote, sign_status: 'signed', status: 'accepted' } };
}

export type InvoiceRow = {
  id: number;
  invoice_reference: string;
  contact_id: number | null;
  quote_id: number | null;
  customer_name: string;
  customer_email: string | null;
  customer_address: string | null;
  title: string | null;
  description: string | null;
  amount_pence: number;
  subtotal_pence: number;
  vat_rate: string | number;
  vat_pence: number;
  discount_pence: number;
  total_pence: number;
  status: string;
  issue_date: string | null;
  due_at: string | null;
  sent_at: string | null;
  paid_at: string | null;
  payment_terms: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceItemRow = {
  id: number;
  invoice_id: number;
  description: string;
  quantity: string | number;
  unit_price_pence: number;
  amount_pence: number;
  sort_order: number;
};

async function replaceInvoiceItems(pool: Pool, invoiceId: number, items: QuoteItemInput[]): Promise<void> {
  await mutate(pool, 'DELETE FROM crm_invoice_items WHERE invoice_id = ?', [invoiceId]);
  let sortOrder = 0;
  for (const item of items) {
    const amount = Math.round(item.quantity * item.unitPricePence);
    await mutate(pool, 'INSERT INTO crm_invoice_items (invoice_id, description, quantity, unit_price_pence, amount_pence, sort_order) VALUES (?,?,?,?,?,?)', [invoiceId, item.description, item.quantity, item.unitPricePence, amount, sortOrder++]);
  }
}

export async function listInvoices(pool: Pool): Promise<(InvoiceRow & { item_count: number })[]> {
  return selectRows(pool, 'SELECT i.*, (SELECT COUNT(*) FROM crm_invoice_items t WHERE t.invoice_id = i.id) AS item_count FROM crm_invoices i ORDER BY i.created_at DESC, i.id DESC LIMIT 500');
}

export async function getInvoice(pool: Pool, id: number): Promise<{ invoice: InvoiceRow; items: InvoiceItemRow[]; contact: ContactRow | undefined } | undefined> {
  const invoice = await selectOne<InvoiceRow>(pool, 'SELECT * FROM crm_invoices WHERE id = ?', [id]);
  if (!invoice) return undefined;
  const items = await selectRows<InvoiceItemRow>(pool, 'SELECT * FROM crm_invoice_items WHERE invoice_id = ? ORDER BY sort_order, id', [id]);
  const contact = invoice.contact_id ? await getContact(pool, invoice.contact_id) : undefined;
  return { invoice, items, contact };
}

export async function createInvoice(pool: Pool, input: InvoiceInput, userId: number | null): Promise<InvoiceRow> {
  const vatRate = input.vatRate ?? 0;
  const discountPence = input.discountPence ?? 0;
  const totals = computeTotals(input.items, vatRate, discountPence);
  const reference = `INV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const company = await loadCompanySettings(pool);
  const result = await mutate(
    pool,
    'INSERT INTO crm_invoices (invoice_reference, contact_id, quote_id, customer_name, customer_email, customer_address, title, description, amount_pence, subtotal_pence, vat_rate, vat_pence, discount_pence, total_pence, status, issue_date, due_at, payment_terms, notes, created_by_user_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())',
    [reference, input.contactId ?? null, input.quoteId ?? null, input.customerName, input.customerEmail || null, input.customerAddress || null, input.title || null, input.description || null, totals.totalPence, totals.subtotalPence, vatRate, totals.vatPence, discountPence, totals.totalPence, 'draft', input.issueDate || todayIso(), input.dueAt || todayIso(company.paymentTermsDays), input.paymentTerms || `Payment due within ${company.paymentTermsDays} days.`, input.notes || null, userId ?? null],
  );
  await replaceInvoiceItems(pool, result.insertId, input.items);
  const invoice = await selectOne<InvoiceRow>(pool, 'SELECT * FROM crm_invoices WHERE id = ?', [result.insertId]);
  if (!invoice) throw new Error('The invoice could not be reloaded after it was created.');
  return invoice;
}

export async function updateInvoice(pool: Pool, id: number, input: InvoiceInput): Promise<InvoiceRow | undefined> {
  const existing = await selectOne<InvoiceRow>(pool, 'SELECT * FROM crm_invoices WHERE id = ?', [id]);
  if (!existing) return undefined;
  const vatRate = input.vatRate ?? 0;
  const discountPence = input.discountPence ?? 0;
  const totals = computeTotals(input.items, vatRate, discountPence);
  await mutate(
    pool,
    'UPDATE crm_invoices SET contact_id = ?, quote_id = ?, customer_name = ?, customer_email = ?, customer_address = ?, title = ?, description = ?, amount_pence = ?, subtotal_pence = ?, vat_rate = ?, vat_pence = ?, discount_pence = ?, total_pence = ?, issue_date = ?, due_at = ?, payment_terms = ?, notes = ? WHERE id = ?',
    [input.contactId ?? null, input.quoteId ?? null, input.customerName, input.customerEmail || null, input.customerAddress || null, input.title || null, input.description || null, totals.totalPence, totals.subtotalPence, vatRate, totals.vatPence, discountPence, totals.totalPence, input.issueDate || existing.issue_date || todayIso(), input.dueAt || existing.due_at || todayIso(7), input.paymentTerms || null, input.notes || null, id],
  );
  await replaceInvoiceItems(pool, id, input.items);
  return selectOne<InvoiceRow>(pool, 'SELECT * FROM crm_invoices WHERE id = ?', [id]);
}

export async function markInvoicePaid(pool: Pool, id: number): Promise<InvoiceRow | undefined> {
  await mutate(pool, "UPDATE crm_invoices SET status = 'paid', paid_at = NOW() WHERE id = ?", [id]);
  await cancelFollowups(pool, 'invoice', id);
  return selectOne<InvoiceRow>(pool, 'SELECT * FROM crm_invoices WHERE id = ?', [id]);
}

export async function invoiceFromQuote(pool: Pool, quoteId: number, userId: number | null, stagePercentage = 100): Promise<InvoiceRow | undefined> {
  const source = await getQuote(pool, quoteId);
  if (!source) return undefined;
  const percentage = Math.min(Math.max(Math.round(stagePercentage), 1), 100);
  const items: QuoteItemInput[] = source.items.map(item => ({
    description: percentage === 100 ? item.description : `${item.description} (${percentage}% stage payment)`,
    quantity: Number(item.quantity),
    unitPricePence: percentage === 100 ? item.unit_price_pence : Math.round(item.unit_price_pence * percentage / 100),
  }));
  const contact = source.contact;
  const address = [contact?.address_line1, contact?.address_line2, contact?.city, contact?.postcode].filter(Boolean).join(', ');
  return createInvoice(pool, {
    contactId: source.quote.contact_id,
    quoteId: source.quote.id,
    customerName: contact?.contact_name || 'Customer',
    customerEmail: contact?.email || undefined,
    customerAddress: address || undefined,
    title: percentage === 100 ? `Invoice for ${source.quote.quote_reference}` : `${percentage}% stage payment - ${source.quote.quote_reference}`,
    vatRate: Number(source.quote.vat_rate),
    items,
  }, userId);
}

export type EmailLogInput = {
  direction: 'outbound' | 'inbound';
  contactId?: number | null;
  templateKey?: string | null;
  relatedType?: string | null;
  relatedId?: number | null;
  from: string;
  to: string;
  replyTo?: string | null;
  subject: string;
  body?: string | null;
  htmlBody?: string | null;
  status: 'queued' | 'sent' | 'failed' | 'received';
  error?: string | null;
  messageId?: string | null;
  sentAt?: string | null;
  receivedAt?: string | null;
};

export async function logEmail(pool: Pool, entry: EmailLogInput): Promise<number> {
  const result = await mutate(
    pool,
    'INSERT INTO crm_emails (direction, contact_id, template_key, related_type, related_id, from_address, to_address, reply_to, subject, body, html_body, status, error, message_id, sent_at, received_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())',
    [entry.direction, entry.contactId ?? null, entry.templateKey ?? null, entry.relatedType ?? null, entry.relatedId ?? null, entry.from, entry.to, entry.replyTo ?? null, entry.subject, entry.body ?? null, entry.htmlBody ?? null, entry.status, entry.error ?? null, entry.messageId ?? null, entry.sentAt ?? null, entry.receivedAt ?? null],
  );
  return result.insertId;
}

export async function listEmails(pool: Pool, direction?: 'outbound' | 'inbound'): Promise<unknown[]> {
  const where = direction ? 'WHERE e.direction = ?' : '';
  const params: QueryValue[] = direction ? [direction] : [];
  return selectRows(pool, `SELECT e.*, c.contact_name FROM crm_emails e LEFT JOIN crm_contacts c ON c.id = e.contact_id ${where} ORDER BY e.created_at DESC, e.id DESC LIMIT 300`, params);
}

export type TemplateRecord = { template_key: string; name: string; subject: string; body: string; is_active: number };

export async function listTemplates(pool: Pool): Promise<TemplateRecord[]> {
  return selectRows<TemplateRecord>(pool, 'SELECT template_key, name, subject, body, is_active FROM crm_email_templates ORDER BY template_key').catch(() => []);
}

export async function getTemplateRecord(pool: Pool, key: string): Promise<{ subject: string; body: string }> {
  const row = await selectOne<{ subject: string; body: string }>(pool, 'SELECT subject, body FROM crm_email_templates WHERE template_key = ? AND is_active = 1', [key]).catch(() => undefined);
  if (row) return row;
  const fallback = findDefaultTemplate(key);
  return fallback ? { subject: fallback.subject, body: fallback.body } : { subject: 'Update from Omni Developments', body: '<p>{{company.name}}</p>' };
}

export async function updateTemplate(pool: Pool, key: string, patch: { subject?: string; body?: string; isActive?: boolean }): Promise<boolean> {
  const fields: string[] = [];
  const params: QueryValue[] = [];
  if (patch.subject !== undefined) { fields.push('subject = ?'); params.push(patch.subject); }
  if (patch.body !== undefined) { fields.push('body = ?'); params.push(patch.body); }
  if (patch.isActive !== undefined) { fields.push('is_active = ?'); params.push(patch.isActive ? 1 : 0); }
  if (!fields.length) return false;
  params.push(key);
  const result = await mutate(pool, `UPDATE crm_email_templates SET ${fields.join(', ')} WHERE template_key = ?`, params);
  return result.affectedRows > 0;
}

export type SendOutcome = { status: 'sent' | 'not-configured' | 'failed'; error?: string; messageId?: string };

function firstNameOf(name: string): string {
  return String(name || '').trim().split(/\s+/)[0] || 'there';
}

function contactAddress(contact?: ContactRow): string {
  return [contact?.address_line1, contact?.address_line2, contact?.city, contact?.postcode].filter(Boolean).join(', ');
}

function quotePdfItems(items: QuoteItemRow[]): PdfLineItem[] {
  return items.map(item => ({ description: item.description, quantity: Number(item.quantity), unitPricePence: item.unit_price_pence, amountPence: item.amount_pence }));
}

export async function sendQuoteEmail(pool: Pool, quoteId: number, baseUrl: string, templateKey = 'quote_issued'): Promise<SendOutcome> {
  const record = await getQuote(pool, quoteId);
  if (!record) return { status: 'failed', error: 'Quote not found.' };
  const { quote, items, contact } = record;
  if (!contact?.email) return { status: 'failed', error: 'This contact has no email address.' };
  const company = await loadCompanySettings(pool);
  let token = quote.sign_token;
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
    await mutate(pool, 'UPDATE crm_quotes SET sign_token = ? WHERE id = ?', [token, quote.id]);
  }
  const signingUrl = `${baseUrl.replace(/\/$/, '')}/sign/${token}`;
  const variables = {
    contact: { name: contact.contact_name, firstName: firstNameOf(contact.contact_name), email: contact.email, company: contact.company_name || '' },
    company: { name: company.name, email: company.email, phone: company.phone },
    quote: { reference: quote.quote_reference, title: quote.title, total: money(quote.total_pence), validUntil: quote.valid_until || '', issueDate: quote.issue_date || '' },
    sign: { link: signingUrl },
  };
  const template = await getTemplateRecord(pool, templateKey);
  const subject = renderPlainTemplate(template.subject, variables);
  const html = wrapEmailHtml(renderTemplate(template.body, variables), subject);
  const pdf = await renderDocumentPdf({
    kind: 'quote',
    reference: quote.quote_reference,
    title: quote.title,
    issueDate: quote.issue_date || todayIso(),
    secondaryDateLabel: 'Valid until',
    secondaryDate: quote.valid_until || '',
    status: quote.status,
    contact: { name: contact.contact_name, company: contact.company_name || undefined, email: contact.email || undefined, address: contactAddress(contact) || undefined },
    items: quotePdfItems(items),
    subtotalPence: quote.subtotal_pence,
    vatRate: Number(quote.vat_rate),
    vatPence: quote.vat_pence,
    discountPence: quote.discount_pence,
    totalPence: quote.total_pence,
    terms: quote.terms || undefined,
    notes: quote.notes || undefined,
    company,
    signingUrl,
  });
  const result = await sendEmail({
    to: contact.email,
    replyTo: company.email,
    subject,
    html,
    attachments: [{ filename: `${quote.quote_reference}.pdf`, content: Buffer.from(pdf), contentType: 'application/pdf' }],
  });
  await logEmail(pool, {
    direction: 'outbound', contactId: contact.id, templateKey, relatedType: 'quote', relatedId: quote.id,
    from: fromAddress(), to: contact.email, replyTo: company.email, subject,
    body: toPlainText(html), htmlBody: html,
    status: result.status === 'sent' ? 'sent' : result.status === 'not-configured' ? 'queued' : 'failed',
    error: result.error || null, messageId: result.messageId || null,
    sentAt: result.status === 'sent' ? new Date().toISOString() : null,
  });
  if (result.status === 'sent') {
    await mutate(pool, "UPDATE crm_quotes SET status = CASE WHEN status IN ('draft','sent','viewed') THEN 'sent' ELSE status END, sent_at = NOW(), sign_status = CASE WHEN sign_status = 'signed' THEN sign_status ELSE 'awaiting' END WHERE id = ?", [quote.id]);
    await touchContact(pool, contact.id);
    await scheduleFollowups(pool, 'quote', quote.id, contact.id);
  }
  return result;
}

export async function sendInvoiceEmail(pool: Pool, invoiceId: number, templateKey = 'invoice_issued'): Promise<SendOutcome> {
  const record = await getInvoice(pool, invoiceId);
  if (!record) return { status: 'failed', error: 'Invoice not found.' };
  const { invoice, items, contact } = record;
  const company = await loadCompanySettings(pool);
  const to = invoice.customer_email || contact?.email || '';
  if (!to) return { status: 'failed', error: 'This invoice has no customer email address.' };
  const customerName = contact?.contact_name || invoice.customer_name;
  const variables = {
    contact: { name: customerName, firstName: firstNameOf(customerName), email: to, company: contact?.company_name || '' },
    company: { name: company.name, email: company.email, phone: company.phone },
    invoice: { reference: invoice.invoice_reference, total: money(invoice.total_pence), dueDate: invoice.due_at || '', issueDate: invoice.issue_date || '', paymentDetails: paymentDetailsText(company) },
  };
  const template = await getTemplateRecord(pool, templateKey);
  const subject = renderPlainTemplate(template.subject, variables);
  const html = wrapEmailHtml(renderTemplate(template.body, variables), subject);
  const pdf = await renderDocumentPdf({
    kind: 'invoice',
    reference: invoice.invoice_reference,
    title: invoice.title || `Invoice ${invoice.invoice_reference}`,
    issueDate: invoice.issue_date || todayIso(),
    secondaryDateLabel: 'Due date',
    secondaryDate: invoice.due_at || '',
    status: invoice.status,
    contact: { name: invoice.customer_name, company: contact?.company_name || undefined, email: to, address: invoice.customer_address || undefined },
    items: items.map(item => ({ description: item.description, quantity: Number(item.quantity), unitPricePence: item.unit_price_pence, amountPence: item.amount_pence })),
    subtotalPence: invoice.subtotal_pence,
    vatRate: Number(invoice.vat_rate),
    vatPence: invoice.vat_pence,
    discountPence: invoice.discount_pence,
    totalPence: invoice.total_pence,
    terms: invoice.payment_terms || undefined,
    notes: invoice.notes || undefined,
    paymentDetails: paymentDetailsText(company),
    company,
  });
  const result = await sendEmail({
    to,
    replyTo: company.email,
    subject,
    html,
    attachments: [{ filename: `${invoice.invoice_reference}.pdf`, content: Buffer.from(pdf), contentType: 'application/pdf' }],
  });
  await logEmail(pool, {
    direction: 'outbound', contactId: contact?.id ?? invoice.contact_id ?? null, templateKey, relatedType: 'invoice', relatedId: invoice.id,
    from: fromAddress(), to, replyTo: company.email, subject,
    body: toPlainText(html), htmlBody: html,
    status: result.status === 'sent' ? 'sent' : result.status === 'not-configured' ? 'queued' : 'failed',
    error: result.error || null, messageId: result.messageId || null,
    sentAt: result.status === 'sent' ? new Date().toISOString() : null,
  });
  if (result.status === 'sent') {
    await mutate(pool, "UPDATE crm_invoices SET status = CASE WHEN status IN ('draft','issued','sent','overdue') THEN 'sent' ELSE status END, sent_at = NOW() WHERE id = ?", [invoice.id]);
    if (invoice.contact_id) await touchContact(pool, invoice.contact_id);
    await scheduleFollowups(pool, 'invoice', invoice.id, invoice.contact_id ?? null);
  }
  return result;
}

export async function sendDocumentEmail(pool: Pool, type: 'quote' | 'invoice', id: number, baseUrl: string, templateKey?: string): Promise<SendOutcome> {
  return type === 'quote'
    ? sendQuoteEmail(pool, id, baseUrl, templateKey || 'quote_issued')
    : sendInvoiceEmail(pool, id, templateKey || 'invoice_issued');
}

export async function sendCustomEmail(pool: Pool, input: { to: string; subject: string; body: string; contactId?: number | null }): Promise<SendOutcome> {
  const html = wrapEmailHtml(input.body, input.subject);
  const result = await sendEmail({ to: input.to, subject: input.subject, html });
  await logEmail(pool, {
    direction: 'outbound', contactId: input.contactId ?? null, from: fromAddress(), to: input.to, subject: input.subject,
    body: toPlainText(html), htmlBody: html,
    status: result.status === 'sent' ? 'sent' : result.status === 'not-configured' ? 'queued' : 'failed',
    error: result.error || null, messageId: result.messageId || null,
    sentAt: result.status === 'sent' ? new Date().toISOString() : null,
  });
  return result;
}

export type InboxSyncResult = { status: 'ok' | 'not-configured' | 'failed'; fetched: number; stored: number; error?: string };

export async function syncInbox(pool: Pool): Promise<InboxSyncResult> {
  if (!imapConfigured()) return { status: 'not-configured', fetched: 0, stored: 0 };
  try {
    const messages = await fetchInboundEmails({ limit: 25 });
    let stored = 0;
    for (const message of messages) {
      if (message.messageId) {
        const existing = await selectOne<{ id: number }>(pool, 'SELECT id FROM crm_emails WHERE message_id = ? LIMIT 1', [message.messageId]);
        if (existing) continue;
      }
      let contactId: number | null = null;
      if (message.fromAddress) {
        const contact = await selectOne<{ id: number }>(pool, 'SELECT id FROM crm_contacts WHERE email = ? LIMIT 1', [message.fromAddress]);
        contactId = contact?.id ?? null;
        if (contactId) await touchContact(pool, contactId);
      }
      await logEmail(pool, {
        direction: 'inbound',
        contactId,
        from: message.fromAddress || 'unknown',
        to: message.toAddress || String(process.env.IMAP_USER || ''),
        subject: message.subject,
        body: message.text.slice(0, 20000),
        htmlBody: message.html ? message.html.slice(0, 20000) : null,
        status: 'received',
        messageId: message.messageId,
        receivedAt: message.receivedAt,
      });
      stored += 1;
    }
    return { status: 'ok', fetched: messages.length, stored };
  } catch (error) {
    return { status: 'failed', fetched: 0, stored: 0, error: error instanceof Error ? error.message : 'Mailbox sync failed.' };
  }
}

/** Replace any pending chase with a fresh 3-day sequence for a document. */
export async function scheduleFollowups(pool: Pool, documentType: 'quote' | 'invoice', documentId: number, contactId: number | null, firstDelayDays = 3): Promise<void> {
  await cancelFollowups(pool, documentType, documentId);
  const templateKey = documentType === 'quote' ? 'quote_reminder_1' : 'invoice_reminder';
  const dueAt = new Date(Date.now() + firstDelayDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  await mutate(
    pool,
    "INSERT INTO crm_followup_sequences (document_type, document_id, contact_id, template_key, due_at, status, attempts, max_attempts, interval_days) VALUES (?,?,?,?,?,'pending',0,3,?)",
    [documentType, documentId, contactId, templateKey, dueAt, firstDelayDays],
  );
}

export async function cancelFollowups(pool: Pool, documentType: 'quote' | 'invoice', documentId: number): Promise<void> {
  await mutate(pool, "UPDATE crm_followup_sequences SET status = 'cancelled' WHERE document_type = ? AND document_id = ? AND status = 'pending'", [documentType, documentId]).catch(() => undefined);
}

export async function listFollowups(pool: Pool): Promise<unknown[]> {
  return selectRows(pool, 'SELECT f.*, c.contact_name FROM crm_followup_sequences f LEFT JOIN crm_contacts c ON c.id = f.contact_id ORDER BY f.due_at ASC, f.id DESC LIMIT 300');
}

export type FollowupRunResult = { processed: number; sent: number; failed: number };

type FollowupJob = { id: number; document_type: 'quote' | 'invoice'; document_id: number; contact_id: number | null; template_key: string; attempts: number; interval_days: number; max_attempts: number };

/**
 * Send every chase that is due. Settled documents (accepted/paid) are cancelled
 * without sending, so a customer is never chased after they have signed or paid.
 */
export async function runDueFollowups(pool: Pool, baseUrl: string): Promise<FollowupRunResult> {
  const due = await selectRows<FollowupJob>(pool, "SELECT id, document_type, document_id, contact_id, template_key, attempts, interval_days, max_attempts FROM crm_followup_sequences WHERE status = 'pending' AND due_at <= NOW() ORDER BY due_at ASC LIMIT 50");
  let sent = 0;
  let failed = 0;
  for (const job of due) {
    const settled = job.document_type === 'quote'
      ? await selectOne<{ status: string }>(pool, 'SELECT status FROM crm_quotes WHERE id = ?', [job.document_id])
      : await selectOne<{ status: string }>(pool, 'SELECT status FROM crm_invoices WHERE id = ?', [job.document_id]);
    const isSettled = !settled || (job.document_type === 'quote'
      ? ['accepted', 'declined', 'expired', 'amended'].includes(settled.status)
      : ['paid', 'void'].includes(settled.status));
    if (isSettled) {
      await mutate(pool, "UPDATE crm_followup_sequences SET status = 'cancelled' WHERE id = ?", [job.id]);
      continue;
    }
    const templateKey = job.attempts === 0 ? job.template_key : job.document_type === 'quote' ? 'quote_reminder_2' : 'invoice_reminder';
    const outcome = await sendDocumentEmail(pool, job.document_type, job.document_id, baseUrl, templateKey);
    const attempts = job.attempts + 1;
    const nextDueAt = new Date(Date.now() + job.interval_days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    if (outcome.status === 'sent') {
      sent += 1;
      if (attempts >= job.max_attempts) {
        await mutate(pool, "UPDATE crm_followup_sequences SET attempts = ?, last_sent_at = NOW(), status = 'cancelled' WHERE id = ?", [attempts, job.id]);
      } else {
        await mutate(pool, 'UPDATE crm_followup_sequences SET attempts = ?, last_sent_at = NOW(), due_at = ? WHERE id = ?', [attempts, nextDueAt, job.id]);
      }
    } else {
      failed += 1;
      await mutate(pool, "UPDATE crm_followup_sequences SET attempts = ?, due_at = ?, status = CASE WHEN ? >= max_attempts THEN 'cancelled' ELSE status END WHERE id = ?", [attempts, nextDueAt, attempts, job.id]).catch(() => undefined);
    }
  }
  return { processed: due.length, sent, failed };
}

/**
 * Background jobs for follow-ups and mailbox sync. Timers are unref'd so they
 * never keep the process alive on their own, and every run is best-effort so a
 * mailbox outage can never crash the web server.
 */
export function startCrmJobs(getPool: () => Pool | null, baseUrl: string): () => void {
  const runTask = (label: string, task: (pool: Pool) => Promise<unknown>) => {
    const pool = getPool();
    if (!pool) return;
    void task(pool).catch((error: unknown) => {
      console.error(`[crm] ${label} failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    });
  };
  const followupTimer = setInterval(() => runTask('follow-up scan', pool => runDueFollowups(pool, baseUrl)), 10 * 60 * 1000);
  const inboxTimer = setInterval(() => runTask('inbox sync', pool => syncInbox(pool)), 15 * 60 * 1000);
  followupTimer.unref();
  inboxTimer.unref();
  return () => {
    clearInterval(followupTimer);
    clearInterval(inboxTimer);
  };
}



