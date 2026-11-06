import type { Express, Request, RequestHandler, Response } from 'express';
import type { Pool } from 'mysql2/promise';
import { z } from 'zod';
import {
  createContact, createInvoice, createQuote, deleteContact, getContact, getInvoice, getQuote, getQuoteByToken,
  invoiceFromQuote, listContacts, listEmails, listFollowups, listInvoices, listQuotes, listTemplates, loadCompanySettings,
  markInvoicePaid, markQuoteViewed, reviseQuote, runDueFollowups, sendCustomEmail, sendDocumentEmail, signQuote, syncInbox, updateContact,
  updateInvoice, updateQuote, updateTemplate,
} from './services/crmService';
import { DEFAULT_TEMPLATES } from './services/templates';

export type CrmRouteDeps = {
  getPool: () => Pool | null;
  adminRequired: RequestHandler;
  baseUrl: string;
};

type Parsed<T> = { data: T; message?: undefined } | { data?: undefined; message: string };

function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): Parsed<z.infer<T>> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const first = result.error.issues[0];
    return { message: first ? `${first.path.join('.') || 'field'}: ${first.message}` : 'The submitted details are invalid.' };
  }
  return { data: result.data };
}

function validId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const contactSchema = z.object({
  contactName: z.string().trim().min(2).max(190),
  companyName: z.string().trim().max(190).optional(),
  email: z.union([z.string().trim().email().max(190), z.literal('')]).optional(),
  telephone: z.string().trim().max(40).optional(),
  addressLine1: z.string().trim().max(190).optional(),
  addressLine2: z.string().trim().max(190).optional(),
  city: z.string().trim().max(120).optional(),
  postcode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(120).optional(),
  isLead: z.boolean().optional(),
  contactType: z.enum(['lead', 'prospect', 'customer', 'supplier', 'partner', 'other']).optional(),
  leadStage: z.enum(['new', 'contacted', 'qualified', 'quoted', 'won', 'lost']).optional(),
  source: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(5000).optional(),
  tags: z.string().trim().max(255).optional(),
});

const itemSchema = z.object({
  description: z.string().trim().min(1).max(255),
  quantity: z.coerce.number().positive().max(100000),
  unitPricePence: z.coerce.number().int().min(0).max(100000000),
});

const dateString = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

const quoteSchema = z.object({
  contactId: z.coerce.number().int().positive(),
  title: z.string().trim().min(2).max(190),
  description: z.string().trim().max(5000).optional(),
  issueDate: z.union([dateString, z.literal('')]).optional(),
  validUntil: z.union([dateString, z.literal('')]).optional(),
  vatRate: z.coerce.number().min(0).max(100).default(0),
  discountPence: z.coerce.number().int().min(0).default(0),
  terms: z.string().trim().max(5000).optional(),
  notes: z.string().trim().max(5000).optional(),
  items: z.array(itemSchema).min(1).max(60),
});

const invoiceSchema = z.object({
  contactId: z.coerce.number().int().positive().optional(),
  quoteId: z.coerce.number().int().positive().optional(),
  customerName: z.string().trim().min(2).max(190),
  customerEmail: z.union([z.string().trim().email().max(190), z.literal('')]).optional(),
  customerAddress: z.string().trim().max(500).optional(),
  title: z.string().trim().max(190).optional(),
  description: z.string().trim().max(5000).optional(),
  issueDate: z.union([dateString, z.literal('')]).optional(),
  dueAt: z.union([dateString, z.literal('')]).optional(),
  vatRate: z.coerce.number().min(0).max(100).default(0),
  discountPence: z.coerce.number().int().min(0).default(0),
  paymentTerms: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(5000).optional(),
  items: z.array(itemSchema).min(1).max(60),
});

const composeSchema = z.object({
  to: z.string().trim().email().max(190),
  subject: z.string().trim().min(1).max(255),
  body: z.string().trim().min(1).max(20000),
  contactId: z.coerce.number().int().positive().optional(),
});

const signSchema = z.object({
  name: z.string().trim().min(2).max(190),
  email: z.string().trim().email().max(190),
  consent: z.literal(true),
});

const templateSchema = z.object({
  subject: z.string().trim().max(255).optional(),
  body: z.string().trim().max(50000).optional(),
  isActive: z.boolean().optional(),
});

export function registerCrmRoutes(app: Express, deps: CrmRouteDeps): void {
  const { adminRequired, baseUrl } = deps;

  const poolOrFail = (res: Response): Pool | null => {
    const pool = deps.getPool();
    if (!pool) {
      res.status(503).json({ message: 'The CRM database is not configured yet. Add the MySQL connection details to enable the sales tools.' });
      return null;
    }
    return pool;
  };

  const staffUserId = (res: Response): number | null => {
    const user = res.locals.staffUser as { id?: number } | undefined;
    return typeof user?.id === 'number' && user.id > 0 ? user.id : null;
  };

  // ---------------------------------------------------------------------------
  // Contacts (leads and customers share one entity)
  // ---------------------------------------------------------------------------
  app.get('/api/admin/contacts', adminRequired, async (req, res, next) => {
    try {
      const pool = deps.getPool();
      if (!pool) return res.json({ records: [] });
      const lead = req.query.lead === 'true' ? true : req.query.lead === 'false' ? false : undefined;
      const records = await listContacts(pool, {
        type: typeof req.query.type === 'string' ? req.query.type : undefined,
        lead,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      });
      return res.json({ records });
    } catch (error) { return next(error); }
  });

  app.get('/api/admin/contacts/:id', adminRequired, async (req, res, next) => {
    const pool = poolOrFail(res);
    if (!pool) return;
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid contact id.' });
    try {
      const contact = await getContact(pool, id);
      if (!contact) return res.status(404).json({ message: 'Contact not found.' });
      return res.json({ contact });
    } catch (error) { return next(error); }
  });

  app.post('/api/admin/contacts', adminRequired, async (req, res, next) => {
    const parsed = parseBody(contactSchema, req.body);
    if (!parsed.data) return res.status(400).json({ message: parsed.message });
    const pool = poolOrFail(res);
    if (!pool) return;
    try {
      const contact = await createContact(pool, parsed.data, staffUserId(res));
      return res.status(201).json({ contact });
    } catch (error) { return next(error); }
  });

  app.patch('/api/admin/contacts/:id', adminRequired, async (req, res, next) => {
    const parsed = parseBody(contactSchema.partial(), req.body);
    if (!parsed.data) return res.status(400).json({ message: parsed.message });
    const pool = poolOrFail(res);
    if (!pool) return;
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid contact id.' });
    try {
      const contact = await updateContact(pool, id, parsed.data);
      if (!contact) return res.status(404).json({ message: 'Contact not found.' });
      return res.json({ contact });
    } catch (error) { return next(error); }
  });

  app.delete('/api/admin/contacts/:id', adminRequired, async (req, res, next) => {
    const pool = poolOrFail(res);
    if (!pool) return;
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid contact id.' });
    try {
      const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM crm_quotes WHERE contact_id = ?', [id]);
      const total = Number((rows as Array<{ total: number | string }>)[0]?.total || 0);
      if (total > 0) return res.status(409).json({ message: 'This contact has quotations linked to it. Revise or remove those first, or keep the contact for your records.' });
      const removed = await deleteContact(pool, id);
      if (!removed) return res.status(404).json({ message: 'Contact not found.' });
      return res.json({ message: 'Contact deleted.' });
    } catch (error) { return next(error); }
  });

  // ---------------------------------------------------------------------------
  // Public e-signature (token based, no staff session required)
  // ---------------------------------------------------------------------------
  app.get('/api/sign/:token', async (req, res, next) => {
    const pool = poolOrFail(res);
    if (!pool) return;
    try {
      const token = String(req.params.token);
      const record = await getQuoteByToken(pool, token);
      if (!record) return res.status(404).json({ message: 'This signing link is not valid or has expired.' });
      await markQuoteViewed(pool, token);
      const company = await loadCompanySettings(pool);
      return res.json({
        document: {
          reference: record.quote.quote_reference,
          title: record.quote.title,
          description: record.quote.description,
          status: record.quote.status,
          signStatus: record.quote.sign_status,
          issueDate: record.quote.issue_date,
          validUntil: record.quote.valid_until,
          terms: record.quote.terms,
          notes: record.quote.notes,
          subtotalPence: record.quote.subtotal_pence,
          vatRate: Number(record.quote.vat_rate),
          vatPence: record.quote.vat_pence,
          discountPence: record.quote.discount_pence,
          totalPence: record.quote.total_pence,
          signedAt: record.quote.signed_at,
          signerName: record.quote.signer_name,
          contactName: record.contact?.contact_name || '',
          contactEmail: record.contact?.email || '',
        },
        items: record.items.map(item => ({ description: item.description, quantity: Number(item.quantity), unitPricePence: item.unit_price_pence, amountPence: item.amount_pence })),
        company: { name: company.name, email: company.email, phone: company.phone, address: company.address },
      });
    } catch (error) { return next(error); }
  });

  app.post('/api/sign/:token', async (req, res, next) => {
    const parsed = parseBody(signSchema, req.body);
    if (!parsed.data) return res.status(400).json({ message: parsed.message });
    const pool = poolOrFail(res);
    if (!pool) return;
    try {
      const token = String(req.params.token);
      const outcome = await signQuote(pool, token, { name: parsed.data.name, email: parsed.data.email, ip: req.ip });
      if (outcome.status === 'not-found') return res.status(404).json({ message: 'This signing link is not valid or has expired.' });
      if (outcome.status === 'signed') {
        const record = await getQuoteByToken(pool, token);
        if (record?.contact?.email) {
          const firstName = record.contact.contact_name.trim().split(/\s+/)[0] || 'there';
          await sendCustomEmail(pool, {
            to: record.contact.email,
            contactId: record.contact.id,
            subject: `Thank you for signing ${record.quote.quote_reference}`,
            body: `<p>Hi ${firstName},</p><p>Thank you for signing quotation <strong>${record.quote.quote_reference}</strong>. We will be in touch about the next steps.</p><p>Kind regards,<br />Omni Developments</p>`,
          });
        }
      }
      return res.json({ signed: true, alreadySigned: outcome.status === 'already-signed', signedAt: outcome.quote.signed_at || new Date().toISOString() });
    } catch (error) { return next(error); }
  });

  // ---------------------------------------------------------------------------
  // Quotes / contracts (create, amend, send, convert to invoice)
  // ---------------------------------------------------------------------------
  app.get('/api/admin/contracts', adminRequired, async (_req, res, next) => {
    try {
      const pool = deps.getPool();
      if (!pool) return res.json({ records: [] });
      return res.json({ records: await listQuotes(pool) });
    } catch (error) { return next(error); }
  });

  app.get('/api/admin/contracts/:id', adminRequired, async (req, res, next) => {
    const pool = poolOrFail(res);
    if (!pool) return;
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid quote id.' });
    try {
      const record = await getQuote(pool, id);
      if (!record) return res.status(404).json({ message: 'Quote not found.' });
      return res.json(record);
    } catch (error) { return next(error); }
  });

  app.post('/api/admin/contracts', adminRequired, async (req, res, next) => {
    const parsed = parseBody(quoteSchema, req.body);
    if (!parsed.data) return res.status(400).json({ message: parsed.message });
    const pool = poolOrFail(res);
    if (!pool) return;
    try {
      const quote = await createQuote(pool, { ...parsed.data, issueDate: parsed.data.issueDate || undefined, validUntil: parsed.data.validUntil || undefined }, staffUserId(res));
      return res.status(201).json({ quote });
    } catch (error) { return next(error); }
  });

  app.patch('/api/admin/contracts/:id', adminRequired, async (req, res, next) => {
    const parsed = parseBody(quoteSchema, req.body);
    if (!parsed.data) return res.status(400).json({ message: parsed.message });
    const pool = poolOrFail(res);
    if (!pool) return;
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid quote id.' });
    try {
      const current = await getQuote(pool, id);
      if (!current) return res.status(404).json({ message: 'Quote not found.' });
      if (current.quote.sign_status === 'signed') return res.status(409).json({ message: 'This contract has been signed. Use Revise to create an amendment rather than editing the signed version.' });
      const quote = await updateQuote(pool, id, { ...parsed.data, issueDate: parsed.data.issueDate || undefined, validUntil: parsed.data.validUntil || undefined });
      if (!quote) return res.status(404).json({ message: 'Quote not found.' });
      return res.json({ quote });
    } catch (error) { return next(error); }
  });

  app.post('/api/admin/contracts/:id/revise', adminRequired, async (req, res, next) => {
    const pool = poolOrFail(res);
    if (!pool) return;
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid quote id.' });
    try {
      const quote = await reviseQuote(pool, id, staffUserId(res));
      if (!quote) return res.status(404).json({ message: 'Quote not found.' });
      return res.status(201).json({ quote });
    } catch (error) { return next(error); }
  });

  app.post('/api/admin/contracts/:id/send', adminRequired, async (req, res, next) => {
    const pool = poolOrFail(res);
    if (!pool) return;
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid quote id.' });
    const templateKey = typeof req.body?.templateKey === 'string' ? req.body.templateKey : undefined;
    try {
      const outcome = await sendDocumentEmail(pool, 'quote', id, baseUrl, templateKey);
      if (outcome.status === 'failed') return res.status(502).json({ message: outcome.error || 'The quote could not be emailed.', outcome });
      return res.json({ outcome });
    } catch (error) { return next(error); }
  });

  app.post('/api/admin/contracts/:id/invoice', adminRequired, async (req, res, next) => {
    const pool = poolOrFail(res);
    if (!pool) return;
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid quote id.' });
    const percentage = Number(req.body?.stagePercentage ?? 100);
    try {
      const invoice = await invoiceFromQuote(pool, id, staffUserId(res), Number.isFinite(percentage) ? percentage : 100);
      if (!invoice) return res.status(404).json({ message: 'Quote not found.' });
      return res.status(201).json({ invoice });
    } catch (error) { return next(error); }
  });

  // ---------------------------------------------------------------------------
  // Invoices (line items, send, mark paid, raise from a quote)
  // ---------------------------------------------------------------------------
  app.get('/api/admin/invoices', adminRequired, async (_req, res, next) => {
    try {
      const pool = deps.getPool();
      if (!pool) return res.json({ records: [] });
      return res.json({ records: await listInvoices(pool) });
    } catch (error) { return next(error); }
  });

  app.get('/api/admin/invoices/:id', adminRequired, async (req, res, next) => {
    const pool = poolOrFail(res);
    if (!pool) return;
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid invoice id.' });
    try {
      const record = await getInvoice(pool, id);
      if (!record) return res.status(404).json({ message: 'Invoice not found.' });
      return res.json(record);
    } catch (error) { return next(error); }
  });

  app.post('/api/admin/invoices', adminRequired, async (req, res, next) => {
    const parsed = parseBody(invoiceSchema, req.body);
    if (!parsed.data) return res.status(400).json({ message: parsed.message });
    const pool = poolOrFail(res);
    if (!pool) return;
    try {
      const invoice = await createInvoice(pool, { ...parsed.data, issueDate: parsed.data.issueDate || undefined, dueAt: parsed.data.dueAt || undefined }, staffUserId(res));
      return res.status(201).json({ invoice });
    } catch (error) { return next(error); }
  });

  app.patch('/api/admin/invoices/:id', adminRequired, async (req, res, next) => {
    const parsed = parseBody(invoiceSchema, req.body);
    if (!parsed.data) return res.status(400).json({ message: parsed.message });
    const pool = poolOrFail(res);
    if (!pool) return;
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid invoice id.' });
    try {
      const current = await getInvoice(pool, id);
      if (!current) return res.status(404).json({ message: 'Invoice not found.' });
      if (current.invoice.status === 'paid') return res.status(409).json({ message: 'This invoice is marked paid. Raise a new invoice instead of editing the paid record.' });
      const invoice = await updateInvoice(pool, id, { ...parsed.data, issueDate: parsed.data.issueDate || undefined, dueAt: parsed.data.dueAt || undefined });
      if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
      return res.json({ invoice });
    } catch (error) { return next(error); }
  });

  app.post('/api/admin/invoices/:id/send', adminRequired, async (req, res, next) => {
    const pool = poolOrFail(res);
    if (!pool) return;
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid invoice id.' });
    const templateKey = typeof req.body?.templateKey === 'string' ? req.body.templateKey : undefined;
    try {
      const outcome = await sendDocumentEmail(pool, 'invoice', id, baseUrl, templateKey);
      if (outcome.status === 'failed') return res.status(502).json({ message: outcome.error || 'The invoice could not be emailed.', outcome });
      return res.json({ outcome });
    } catch (error) { return next(error); }
  });

  app.post('/api/admin/invoices/:id/paid', adminRequired, async (req, res, next) => {
    const pool = poolOrFail(res);
    if (!pool) return;
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid invoice id.' });
    try {
      const invoice = await markInvoicePaid(pool, id);
      if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
      return res.json({ invoice });
    } catch (error) { return next(error); }
  });

  app.post('/api/admin/invoices/from-quote/:quoteId', adminRequired, async (req, res, next) => {
    const pool = poolOrFail(res);
    if (!pool) return;
    const quoteId = validId(req.params.quoteId);
    if (!quoteId) return res.status(400).json({ message: 'Invalid quote id.' });
    const percentage = Number(req.body?.stagePercentage ?? 100);
    try {
      const invoice = await invoiceFromQuote(pool, quoteId, staffUserId(res), Number.isFinite(percentage) ? percentage : 100);
      if (!invoice) return res.status(404).json({ message: 'Quote not found.' });
      return res.status(201).json({ invoice });
    } catch (error) { return next(error); }
  });

  // ---------------------------------------------------------------------------
  // Email log, templates, mailbox sync and follow-up automation
  // ---------------------------------------------------------------------------
  app.get('/api/admin/emails', adminRequired, async (req, res, next) => {
    try {
      const pool = deps.getPool();
      if (!pool) return res.json({ records: [] });
      const direction = req.query.direction === 'inbound' ? 'inbound' : req.query.direction === 'outbound' ? 'outbound' : undefined;
      return res.json({ records: await listEmails(pool, direction) });
    } catch (error) { return next(error); }
  });

  app.post('/api/admin/emails/send', adminRequired, async (req, res, next) => {
    const parsed = parseBody(composeSchema, req.body);
    if (!parsed.data) return res.status(400).json({ message: parsed.message });
    const pool = poolOrFail(res);
    if (!pool) return;
    try {
      const outcome = await sendCustomEmail(pool, { to: parsed.data.to, subject: parsed.data.subject, body: parsed.data.body, contactId: parsed.data.contactId ?? null });
      if (outcome.status === 'failed') return res.status(502).json({ message: outcome.error || 'The email could not be sent.', outcome });
      return res.status(201).json({ outcome });
    } catch (error) { return next(error); }
  });

  app.post('/api/admin/emails/sync', adminRequired, async (_req, res, next) => {
    const pool = poolOrFail(res);
    if (!pool) return;
    try {
      const result = await syncInbox(pool);
      if (result.status === 'failed') return res.status(502).json({ message: result.error || 'Mailbox sync failed.', result });
      return res.json({ result });
    } catch (error) { return next(error); }
  });

  app.get('/api/admin/email-templates', adminRequired, async (_req, res, next) => {
    try {
      const fallback = DEFAULT_TEMPLATES.map(template => ({ template_key: template.key, name: template.name, subject: template.subject, body: template.body, is_active: 1 }));
      const pool = deps.getPool();
      if (!pool) return res.json({ records: fallback });
      const records = await listTemplates(pool);
      return res.json({ records: records.length ? records : fallback });
    } catch (error) { return next(error); }
  });

  app.patch('/api/admin/email-templates/:key', adminRequired, async (req, res, next) => {
    const parsed = parseBody(templateSchema, req.body);
    if (!parsed.data) return res.status(400).json({ message: parsed.message });
    const pool = poolOrFail(res);
    if (!pool) return;
    try {
      const updated = await updateTemplate(pool, String(req.params.key), parsed.data);
      if (!updated) return res.status(404).json({ message: 'Template not found.' });
      return res.json({ message: 'Template updated.' });
    } catch (error) { return next(error); }
  });

  app.get('/api/admin/followups', adminRequired, async (_req, res, next) => {
    try {
      const pool = deps.getPool();
      if (!pool) return res.json({ records: [] });
      return res.json({ records: await listFollowups(pool) });
    } catch (error) { return next(error); }
  });

  app.post('/api/admin/followups/run', adminRequired, async (_req, res, next) => {
    const pool = poolOrFail(res);
    if (!pool) return;
    try {
      return res.json({ result: await runDueFollowups(pool, baseUrl) });
    } catch (error) { return next(error); }
  });

  app.get('/api/admin/company-settings', adminRequired, async (_req, res, next) => {
    const pool = poolOrFail(res);
    if (!pool) return;
    try {
      return res.json({ company: await loadCompanySettings(pool) });
    } catch (error) { return next(error); }
  });
}
