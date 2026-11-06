import crypto from 'node:crypto';
import net from 'node:net';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applyAuthoritativeMigrations, availablePort, requiredTestDatabase } from './mysql.test-support';
import { clientAddress, databaseSettings, login, sessionCookie, startPhp, type PhpServer } from './php-cgi.test-support';

/*
 * CRM sales documents on the PHP API (docs/CRM_SALES.md), through php-cgi against a disposable MySQL
 * database: line items/VAT, PDFs, sending, public e-signature, revisions, invoices, templates,
 * follow-ups, settings, mail settings, contacts and a real SMTP conversation with a local fake server.
 */

type Json = Record<string, any>;
type Reply = { status: number; body: Json; headers: Headers; raw: Buffer };

/** A tiny SMTP server: EHLO, AUTH PLAIN/LOGIN, MAIL, RCPT, DATA, QUIT. Records each session. */
type SmtpSession = { mailFrom: string; rcpt: string[]; data: string; auth: string };
async function startFakeSmtp(options: { user: string; password: string; rejectAuth?: boolean }) {
  const sessions: SmtpSession[] = [];
  const server = net.createServer(socket => {
    const session: SmtpSession = { mailFrom: '', rcpt: [], data: '', auth: '' };
    sessions.push(session);
    let buffer = '';
    let inData = false;
    let loginStep = 0;
    let loginUser = '';
    const reply = (line: string) => socket.write(`${line}\r\n`);
    const checkAuth = (user: string, password: string) => {
      session.auth = user;
      if (options.rejectAuth || user !== options.user || password !== options.password) reply('535 5.7.8 Authentication failed');
      else reply('235 2.7.0 Authentication successful');
    };
    reply('220 fake.smtp.test ESMTP');
    socket.on('data', chunk => {
      buffer += chunk.toString('latin1');
      while (true) {
        if (inData) {
          const end = buffer.indexOf('\r\n.\r\n');
          if (end < 0) return;
          session.data = buffer.slice(0, end);
          buffer = buffer.slice(end + 5);
          inData = false;
          reply('250 2.0.0 Ok: queued');
          continue;
        }
        const index = buffer.indexOf('\r\n');
        if (index < 0) return;
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        const upper = line.toUpperCase();
        if (loginStep === 1) { loginUser = Buffer.from(line, 'base64').toString(); loginStep = 2; reply('334 UGFzc3dvcmQ6'); continue; }
        if (loginStep === 2) { loginStep = 0; checkAuth(loginUser, Buffer.from(line, 'base64').toString()); continue; }
        if (upper.startsWith('EHLO') || upper.startsWith('HELO')) socket.write('250-fake.smtp.test\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n');
        else if (upper.startsWith('AUTH PLAIN ')) {
          const [, user, password] = Buffer.from(line.slice(11), 'base64').toString().split('\0');
          checkAuth(user, password);
        } else if (upper === 'AUTH LOGIN') { loginStep = 1; reply('334 VXNlcm5hbWU6'); }
        else if (upper.startsWith('MAIL FROM:')) { session.mailFrom = line.slice(10).trim(); reply('250 2.1.0 Ok'); }
        else if (upper.startsWith('RCPT TO:')) { session.rcpt.push(line.slice(8).trim()); reply('250 2.1.5 Ok'); }
        else if (upper === 'DATA') { inData = true; reply('354 End data with <CR><LF>.<CR><LF>'); }
        else if (upper === 'QUIT') { reply('221 2.0.0 Bye'); socket.end(); return; }
        else reply('502 5.5.2 Command not recognised');
      }
    });
    socket.on('error', () => undefined);
  });
  const port = await availablePort();
  await new Promise<void>(resolve => server.listen(port, '127.0.0.1', resolve));
  return { port, sessions, close: () => new Promise<void>(resolve => server.close(() => resolve())) };
}

/** Decodes the base64 body of the MIME part whose headers contain $marker. */
function mimePart(data: string, marker: string) {
  const start = data.indexOf(marker);
  if (start < 0) return Buffer.alloc(0);
  const bodyStart = data.indexOf('\r\n\r\n', start) + 4;
  const bodyEnd = data.indexOf('\r\n--', bodyStart);
  return Buffer.from(data.slice(bodyStart, bodyEnd).replace(/\s+/g, ''), 'base64');
}

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

describe('PHP CRM sales documents with MySQL', () => {
  const config = requiredTestDatabase();
  const runId = crypto.randomUUID().split('-').join('').slice(0, 10);
  const ownerEmail = `sales-owner-${runId}@example.invalid`;
  const staffEmail = `sales-staff-${runId}@example.invalid`;
  const password = crypto.randomBytes(18).toString('base64url');
  const cronSecret = crypto.randomBytes(24).toString('hex');
  const smtpUser = 'crm@example.test';
  const smtpPassword = `smtp-${crypto.randomBytes(6).toString('hex')}`;
  let connection: mysql.Connection;
  let php: PhpServer;
  let base: Record<string, string>;
  let owner = '';
  let staff = '';

  const call = async (server: PhpServer, cookie: string, method: string, route: string, body?: unknown): Promise<Reply> => {
    const response = await fetch(`${server.baseUrl}/api${route}`, {
      method,
      headers: { ...(cookie ? { Cookie: cookie } : {}), 'X-Forwarded-For': clientAddress(), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const raw = Buffer.from(await response.arrayBuffer());
    let parsed: Json = {};
    if (String(response.headers.get('content-type')).includes('json')) parsed = JSON.parse(raw.toString('utf8') || '{}');
    return { status: response.status, body: parsed, headers: response.headers, raw };
  };
  const crm = (method: string, route: string, body?: unknown, cookie = owner, server = php) => call(server, cookie, method, `/admin/crm${route}`, body);
  const createLead = async (extra: Json = {}) => {
    const reply = await crm('POST', '/leads', { name: `Jane Customer ${runId}`, email: `jane-${crypto.randomBytes(4).toString('hex')}@example.invalid`, phone: '07123 456789', address: '1 High Street', postcode: 'M20 1AA', ...extra });
    expect(reply.status).toBe(201);
    return reply.body.lead as Json;
  };
  const followupFor = async (type: string, id: number) => {
    const list = await crm('GET', '/followups');
    return (list.body.records as Json[]).find(row => row.documentType === type && row.documentId === id);
  };

  beforeAll(async () => {
    connection = await mysql.createConnection({ ...config, multipleStatements: true });
    await applyAuthoritativeMigrations(connection);
    await applyAuthoritativeMigrations(connection); // migrations must be repeatable
    const hash = bcrypt.hashSync(password, 10);
    await connection.execute("INSERT INTO users (email, password_hash, display_name, role, is_active) VALUES (?, ?, 'Sales Owner', 'owner', TRUE), (?, ?, 'Sales Staff', 'staff', TRUE)", [ownerEmail, hash, staffEmail, hash]);
    // Keep the automatic (every 10 minutes) follow-up run out of the way; it is exercised explicitly.
    await connection.query("INSERT INTO site_settings (setting_key, setting_value) VALUES ('crm.followups_last_run', '9999-12-31 00:00:00') ON DUPLICATE KEY UPDATE setting_value = '9999-12-31 00:00:00'");
    await connection.query("DELETE FROM site_settings WHERE setting_key LIKE 'mail.%'");
    await connection.query("UPDATE site_settings SET setting_value = '0' WHERE setting_key = 'crm.default_vat_rate_bp'");
    await connection.query("UPDATE site_settings SET setting_value = '7' WHERE setting_key = 'crm.payment_terms_days'");
    base = { ...databaseSettings(config), COOKIE_SECURE: 'false', STAGING_MODE: 'false', TRUST_PROXY: '1', APP_URL: 'https://crm.example.test', BOOTSTRAP_ADMIN_EMAIL: '', BOOTSTRAP_ADMIN_PASSWORD: '' };
    php = await startPhp(base);
    owner = sessionCookie(await login(php.baseUrl, ownerEmail, password));
    staff = sessionCookie(await login(php.baseUrl, staffEmail, password));
    expect(owner).toMatch(/^omni_staff_session=/);
    expect(staff).toMatch(/^omni_staff_session=/);
  });

  afterAll(async () => {
    await php?.close();
    await connection.query("DELETE FROM site_settings WHERE setting_key LIKE 'mail.%'").catch(() => undefined);
    await connection.execute('DELETE FROM users WHERE email IN (?, ?)', [ownerEmail, staffEmail]).catch(() => undefined);
    await connection.end();
  });

  it('applies a missing 005 migration on the first staff request, once, even when requests race', async () => {
    await connection.query("DELETE FROM schema_migrations WHERE version = '005_crm_sales'");
    await connection.query('DROP TABLE crm_followups');
    const replies = await Promise.all([crm('GET', '/mail-status'), crm('GET', '/mail-status'), crm('GET', '/followups')]);
    for (const reply of replies) expect(reply.status).toBe(200);
    const [tables] = await connection.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_followups'");
    expect(Number(tables[0].n)).toBe(1);
    const [versions] = await connection.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS n FROM schema_migrations WHERE version = '005_crm_sales'");
    expect(Number(versions[0].n)).toBe(1);
    expect(replies[0].body.status).toMatchObject({ outboundEnabled: false, smtpConfigured: false, imapConfigured: false, cronConfigured: false });
    expect(typeof replies[0].body.status.imapAvailable).toBe('boolean');
  });

  it('creates contacts with just a name plus email or phone, with company and type, and filters by type', async () => {
    const byEmail = await crm('POST', '/leads', { name: 'Email Only', email: `only-${runId}@example.invalid` });
    expect(byEmail.status).toBe(201);
    expect(byEmail.body.lead).toMatchObject({ name: 'Email Only', contactType: 'prospect', companyName: '' });
    const byPhone = await crm('POST', '/leads', { name: 'Phone Only', phone: '07000 111222' });
    expect(byPhone.status).toBe(201);
    const neither = await crm('POST', '/leads', { name: 'Nobody' });
    expect(neither.status).toBe(400);
    expect(neither.body.message).toBe('Add a phone number or email address.');
    const badType = await crm('POST', '/leads', { name: 'Bad', phone: '0700', contactType: 'friend' });
    expect(badType.status).toBe(400);

    const supplier = await crm('POST', '/leads', { name: `Timber Merchant ${runId}`, companyName: 'Oak & Co Ltd', contactType: 'supplier', email: `oak-${runId}@example.invalid` });
    expect(supplier.status).toBe(201);
    expect(supplier.body.lead).toMatchObject({ companyName: 'Oak & Co Ltd', contactType: 'supplier' });
    const patched = await crm('PATCH', `/leads/${byPhone.body.lead.id}`, { companyName: 'Phone Ltd', contactType: 'other' });
    expect(patched.body.lead).toMatchObject({ companyName: 'Phone Ltd', contactType: 'other' });

    const suppliers = await crm('GET', '/leads?type=supplier');
    const ids = (suppliers.body.records as Json[]).map(row => row.id);
    expect(ids).toContain(supplier.body.lead.id);
    expect(ids).not.toContain(byEmail.body.lead.id);
    expect((suppliers.body.records as Json[]).every(row => row.contactType === 'supplier')).toBe(true);
    expect((await crm('GET', '/leads?type=friend')).status).toBe(400);
    expect((await crm('GET', `/leads?q=${encodeURIComponent('Oak & Co')}`)).body.records.map((row: Json) => row.id)).toContain(supplier.body.lead.id);
  });

  it('computes line-item totals and VAT, keeps amount-only quotes working, and serves a PDF', async () => {
    const lead = await createLead({ companyName: 'Customer Holdings Ltd' });
    const quote = await crm('POST', '/quotes', {
      leadId: lead.id, title: 'Rear extension', vatRatePercent: 20,
      items: [{ description: 'Labour', quantity: 2.5, unitPricePence: 10000, amountPence: 1 }, { description: 'Materials', quantity: 1, unitPricePence: 33333 }],
    });
    expect(quote.status).toBe(201);
    expect(quote.body.quote).toMatchObject({
      reference: expect.stringMatching(/^Q-\d{4,}$/), status: 'draft', subtotalPence: 58333, vatRatePercent: 20, vatPence: 11667, amountPence: 70000,
      customerName: lead.name, customerCompany: 'Customer Holdings Ltd', customerAddress: '1 High Street\nM20 1AA', customerEmail: lead.email,
      quoteDate: today(), version: 1, parentQuoteId: null, signingUrl: null,
    });
    expect(quote.body.quote.items).toEqual([
      expect.objectContaining({ description: 'Labour', quantity: 2.5, unitPricePence: 10000, amountPence: 25000 }),
      expect.objectContaining({ description: 'Materials', quantity: 1, unitPricePence: 33333, amountPence: 33333 }),
    ]);
    expect(quote.body.quote.terms).toContain('valid for 30 days');

    const legacy = await crm('POST', '/quotes', { leadId: lead.id, title: 'Legacy amount', amountPence: 50000 });
    expect(legacy.status).toBe(201);
    expect(legacy.body.quote).toMatchObject({ amountPence: 50000, subtotalPence: 50000, vatPence: 0, vatRatePercent: 0 });
    expect(legacy.body.quote.items).toEqual([expect.objectContaining({ description: 'Legacy amount', quantity: 1, amountPence: 50000 })]);
    expect((await crm('POST', '/quotes', { leadId: lead.id, title: 'No money' })).status).toBe(400);

    const edited = await crm('PATCH', `/quotes/${quote.body.quote.id}`, { customerAddress: 'Unit 4\nTrafford Park\nM17 1AB', quoteDate: '2026-11-01' });
    expect(edited.body.quote).toMatchObject({ customerAddress: 'Unit 4\nTrafford Park\nM17 1AB', quoteDate: '2026-11-01' });
    const fetched = await crm('GET', `/quotes/${quote.body.quote.id}`);
    expect(fetched.body.quote.id).toBe(quote.body.quote.id);

    const pdf = await crm('GET', `/quotes/${quote.body.quote.id}/pdf`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get('content-type')).toBe('application/pdf');
    expect(pdf.headers.get('content-disposition')).toContain(`${quote.body.quote.reference}.pdf`);
    expect(pdf.raw.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.raw.toString('latin1')).toContain('%%EOF');
    expect(pdf.raw.toString('latin1')).toContain('(Trafford Park)');
    expect(pdf.raw.toString('latin1')).toContain('\xA3700.00'); // total 70000 pence; £ in WinAnsi
  });

  it('sends a quote without SMTP as queued, then the customer signs it publicly; signed quotes are locked and revisions supersede them', async () => {
    const lead = await createLead();
    const created = await crm('POST', '/quotes', { leadId: lead.id, title: 'Loft conversion', items: [{ description: 'Loft', quantity: 1, unitPricePence: 2000000 }] });
    const quoteId = created.body.quote.id;
    const sent = await crm('POST', `/quotes/${quoteId}/send`, { message: 'Lovely to meet you.' });
    expect(sent.status).toBe(200);
    expect(sent.body.quote.status).toBe('sent');
    expect(sent.body.quote.signingUrl).toMatch(/^https:\/\/crm\.example\.test\/sign\/[a-f0-9]{64}$/);
    expect(sent.body.quote.emailedAt).toBeNull();
    expect(sent.body.email).toMatchObject({ status: 'queued', direction: 'outbound', templateKey: 'quote_issued', relatedType: 'quote', relatedId: quoteId, to: lead.email });
    expect(sent.body.email.error).toMatch(/switched off/);
    expect(sent.body.email.body).toContain('Lovely to meet you.');
    expect(sent.body.email.body).toContain(sent.body.quote.signingUrl);
    const detail = await crm('GET', `/leads/${lead.id}`);
    expect(detail.body.lead.stage).toBe('quoted');
    expect(detail.body.emails).toEqual([expect.objectContaining({ id: sent.body.email.id })]);
    const followup = await followupFor('quote', quoteId);
    expect(followup).toMatchObject({ status: 'pending', attempts: 0, maxAttempts: 3, templateKey: 'quote_reminder', documentReference: created.body.quote.reference });
    expect(Date.parse(followup!.dueAt) - Date.now()).toBeGreaterThan(2.9 * 86400000);

    const token = String(sent.body.quote.signingUrl).split('/').pop();
    expect((await call(php, '', 'GET', `/sign/${'0'.repeat(64)}`)).status).toBe(404);
    const view = await call(php, '', 'GET', `/sign/${token}`);
    expect(view.status).toBe(200);
    expect(view.body.document).toMatchObject({ reference: created.body.quote.reference, status: 'sent', customerName: lead.name, totalPence: 2000000, company: { name: 'Omni Developments Ltd' } });
    const publicPdf = await call(php, '', 'GET', `/sign/${token}/pdf`);
    expect(publicPdf.raw.subarray(0, 5).toString()).toBe('%PDF-');
    expect((await call(php, '', 'POST', `/sign/${token}`, { name: 'Jane Customer', agree: false })).status).toBe(400);
    expect((await call(php, '', 'POST', `/sign/${token}`, { name: 'J', agree: true })).status).toBe(400);

    const signed = await call(php, '', 'POST', `/sign/${token}`, { name: 'Jane Customer', agree: true });
    expect(signed.status).toBe(200);
    expect(signed.body.document).toMatchObject({ status: 'accepted', signedName: 'Jane Customer' });
    expect(signed.body.document.signedAt).toBeTruthy();
    const again = await call(php, '', 'POST', `/sign/${token}`, { name: 'Jane Customer', agree: true });
    expect(again.status).toBe(409);
    const [rows] = await connection.execute<mysql.RowDataPacket[]>('SELECT signed_ip, signed_user_agent FROM crm_quotes WHERE id = ?', [quoteId]);
    expect(rows[0].signed_ip).toMatch(/^10\./);
    const afterSign = await crm('GET', `/leads/${lead.id}`);
    expect(afterSign.body.lead).toMatchObject({ stage: 'won', contactType: 'customer' });
    expect(afterSign.body.activities.map((row: Json) => row.body).join('\n')).toContain('signed electronically by Jane Customer');
    expect((await followupFor('quote', quoteId))!.status).toBe('cancelled');
    const signedPdf = await crm('GET', `/quotes/${quoteId}/pdf`);
    expect(signedPdf.raw.toString('latin1')).toContain('Accepted and signed electronically');

    const locked = await crm('PATCH', `/quotes/${quoteId}`, { items: [{ description: 'Cheaper', quantity: 1, unitPricePence: 1 }] });
    expect(locked.status).toBe(409);
    expect(locked.body.message).toBe('This quote has been signed. Revise it to make changes.');
    expect((await crm('PATCH', `/quotes/${quoteId}`, { terms: 'Different' })).status).toBe(409);
    expect((await crm('PATCH', `/quotes/${quoteId}`, { notes: 'Start in March' })).status).toBe(200);
    expect((await crm('POST', `/quotes/${quoteId}/send`, {})).status).toBe(409);

    const revised = await crm('POST', `/quotes/${quoteId}/revise`);
    expect(revised.status).toBe(201);
    expect(revised.body.quote).toMatchObject({ reference: `${created.body.quote.reference}-v2`, version: 2, parentQuoteId: quoteId, status: 'draft', amountPence: 2000000 });
    expect(revised.body.quote.items).toEqual([expect.objectContaining({ description: 'Loft', amountPence: 2000000 })]);
    const original = await crm('GET', `/quotes/${quoteId}`);
    expect(original.body.quote).toMatchObject({ status: 'amended', revisedById: revised.body.quote.id, signingUrl: null });
    expect((await call(php, '', 'GET', `/sign/${token}`)).status).toBe(410);
    expect((await crm('POST', `/quotes/${quoteId}/revise`)).status).toBe(409);
  });

  it('raises stage invoices from a quote, sends them, cancels reminders when paid and keeps paid invoices read-only', async () => {
    const lead = await createLead();
    const quote = await crm('POST', '/quotes', { leadId: lead.id, title: 'Kitchen', vatRatePercent: 20, items: [{ description: 'Kitchen fit', quantity: 1, unitPricePence: 100000 }] });
    const quoteId = quote.body.quote.id;
    expect((await crm('POST', `/invoices/from-quote/${quoteId}`, { percent: 25 })).status).toBe(409); // still a draft
    await crm('POST', `/quotes/${quoteId}/send`, {});

    const deposit = await crm('POST', `/invoices/from-quote/${quoteId}`, { stageLabel: 'Deposit', percent: 25 });
    expect(deposit.status).toBe(201);
    expect(deposit.body.invoice).toMatchObject({
      status: 'draft', quoteId, stageLabel: 'Deposit', subtotalPence: 25000, vatRatePercent: 20, vatPence: 5000, amountPence: 30000,
      customerName: lead.name, customerEmail: lead.email, paymentTermsDays: 7,
    });
    expect(deposit.body.invoice.items).toEqual([expect.objectContaining({ description: `Deposit — 25% of ${quote.body.quote.reference}`, amountPence: 25000 })]);
    const full = await crm('POST', `/invoices/from-quote/${quoteId}`, {});
    expect(full.body.invoice).toMatchObject({ subtotalPence: 100000, vatPence: 20000, amountPence: 120000 });
    expect((await crm('POST', `/invoices/from-quote/${quoteId}`, { percent: 150 })).status).toBe(400);

    const invoiceId = deposit.body.invoice.id;
    const sent = await crm('POST', `/invoices/${invoiceId}/send`, {});
    expect(sent.status).toBe(200);
    expect(sent.body.invoice).toMatchObject({ status: 'issued', invoiceDate: today(), dueAt: addDays(today(), 7), sentAt: null });
    expect(sent.body.email).toMatchObject({ status: 'queued', templateKey: 'invoice_issued' });
    expect(sent.body.email.body).toContain('60-15-25');
    expect((await followupFor('invoice', invoiceId))!.status).toBe('pending');

    const terms = await crm('PATCH', `/invoices/${invoiceId}`, { poNumber: 'PO-77', supplyDate: '2026-11-02', paymentTermsDays: 14 });
    expect(terms.status).toBe(200);
    expect(terms.body.invoice).toMatchObject({ poNumber: 'PO-77', supplyDate: '2026-11-02', paymentTermsDays: 14, dueAt: addDays(today(), 14) });

    const paid = await crm('PATCH', `/invoices/${invoiceId}`, { status: 'paid' });
    expect(paid.body.invoice.status).toBe('paid');
    expect(paid.body.invoice.paidAt).toBeTruthy();
    expect((await followupFor('invoice', invoiceId))!.status).toBe('cancelled');
    expect((await crm('GET', `/leads/${lead.id}`)).body.lead.contactType).toBe('customer');

    const blocked = await crm('PATCH', `/invoices/${invoiceId}`, { items: [{ description: 'Changed', quantity: 1, unitPricePence: 1 }] });
    expect(blocked.status).toBe(409);
    expect((await crm('PATCH', `/invoices/${invoiceId}`, { poNumber: 'PO-78' })).status).toBe(409);
    // The same values sent back unchanged, plus a note, are fine.
    expect((await crm('PATCH', `/invoices/${invoiceId}`, { poNumber: 'PO-77', notes: 'Paid by bank transfer' })).status).toBe(200);
    const pdf = (await crm('GET', `/invoices/${invoiceId}/pdf`)).raw.toString('latin1');
    expect(pdf.slice(0, 5)).toBe('%PDF-');
    expect(pdf).toContain('(PAID)');
    expect(pdf).toContain('PO number: PO-77');
    expect(pdf).toContain('(65714946)');
    const reopened = await crm('PATCH', `/invoices/${invoiceId}`, { status: 'issued' });
    expect(reopened.body.invoice).toMatchObject({ status: 'issued', paidAt: null });

    const direct = await crm('POST', '/invoices', { leadId: lead.id, amountPence: 9900, status: 'issued', invoiceDate: '2026-01-10', paymentTermsDays: 14 });
    expect(direct.body.invoice).toMatchObject({ invoiceDate: '2026-01-10', dueAt: '2026-01-24', amountPence: 9900, items: [expect.objectContaining({ amountPence: 9900 })] });
    const longer = await crm('PATCH', `/invoices/${direct.body.invoice.id}`, { paymentTermsDays: 30 });
    expect(longer.body.invoice.dueAt).toBe('2026-02-09');
  });

  it('runs due follow-ups on demand and logs composed emails against the lead', async () => {
    const lead = await createLead();
    const quote = await crm('POST', '/quotes', { leadId: lead.id, title: 'Porch', amountPence: 450000 });
    await crm('POST', `/quotes/${quote.body.quote.id}/send`, {});
    await connection.execute("UPDATE crm_followups SET due_at = '2000-01-01 00:00:00' WHERE document_type = 'quote' AND document_id = ?", [quote.body.quote.id]);
    const run = await crm('POST', '/followups/run');
    expect(run.status).toBe(200);
    expect(run.body.result.failed).toBeGreaterThanOrEqual(1); // queued (sending is switched off) is never counted as sent
    expect(await followupFor('quote', quote.body.quote.id)).toMatchObject({ status: 'pending', attempts: 1 });

    const composed = await crm('POST', '/emails', { leadId: lead.id, to: lead.email, subject: 'Site visit', body: 'Hello,\n\nSee you on Tuesday.' });
    expect(composed.status).toBe(201);
    expect(composed.body.email).toMatchObject({ status: 'queued', subject: 'Site visit', leadId: lead.id });
    expect(composed.body.email.body).toBe('<p>Hello,</p><p>See you on Tuesday.</p>');
    expect((await crm('POST', '/emails', { to: 'not-an-email', subject: 'x', body: 'y' })).status).toBe(400);
    const list = await crm('GET', `/emails?leadId=${lead.id}&direction=outbound`);
    expect((list.body.records as Json[]).map(row => row.id)).toContain(composed.body.email.id);
    expect((await crm('GET', '/emails?direction=sideways')).status).toBe(400);
    const activities = (await crm('GET', `/leads/${lead.id}`)).body.activities as Json[];
    expect(activities.some(row => row.kind === 'email' && String(row.body).includes('Site visit'))).toBe(true);
    expect((await crm('POST', '/emails/sync')).body.result).toMatchObject({ status: 'not-configured', imported: 0 });
  });

  it('edits templates, and limits company and mail settings to owners and administrators', async () => {
    const templates = await crm('GET', '/email-templates');
    expect((templates.body.templates as Json[]).map(row => row.key)).toEqual(['quote_issued', 'quote_reminder', 'quote_accepted', 'invoice_issued', 'invoice_reminder']);
    expect(templates.body.templates[0].placeholders).toContain('sign.link');
    const patched = await crm('PATCH', '/email-templates/quote_reminder', { subject: 'Any questions about {{quote.reference}}?', isActive: false });
    expect(patched.body.template).toMatchObject({ key: 'quote_reminder', subject: 'Any questions about {{quote.reference}}?', isActive: false });
    expect((await crm('PATCH', '/email-templates/quote_reminder', { isActive: true })).body.template.isActive).toBe(true);
    expect((await crm('PATCH', '/email-templates/nope', { subject: 'x' })).status).toBe(404);

    const settings = await crm('GET', '/settings', undefined, staff);
    expect(settings.body.settings).toMatchObject({ companyName: 'Omni Developments Ltd', bankSortCode: '60-15-25', bankAccountNumber: '65714946', paymentTermsDays: 7, defaultVatRatePercent: 0 });
    expect((await crm('PATCH', '/settings', { companyNumber: '12345678' }, staff)).status).toBe(403);
    const updated = await crm('PATCH', '/settings', { companyNumber: '12345678', defaultVatRatePercent: 20 });
    expect(updated.status).toBe(200);
    expect(updated.body.settings).toMatchObject({ companyNumber: '12345678', defaultVatRatePercent: 20 });
    const lead = await createLead();
    const quote = await crm('POST', '/quotes', { leadId: lead.id, title: 'VAT default', items: [{ description: 'Work', quantity: 1, unitPricePence: 1000 }] });
    expect(quote.body.quote).toMatchObject({ vatRatePercent: 20, amountPence: 1200 });
    expect((await crm('GET', `/quotes/${quote.body.quote.id}/pdf`)).raw.toString('latin1')).toContain('Company no. 12345678');
    await crm('PATCH', '/settings', { companyNumber: '', defaultVatRatePercent: 0 });

    expect((await crm('PATCH', '/mail-settings', { smtpHost: 'smtp.example.test' }, staff)).status).toBe(403);
  });

  it('keeps mail passwords write-only and encrypted, with config > database > Zoho defaults', async () => {
    const defaults = await crm('GET', '/mail-settings');
    expect(defaults.status).toBe(200);
    expect(defaults.body.settings).toMatchObject({
      outboundEnabled: false, smtpHost: 'smtppro.zoho.uk', smtpPort: 465, smtpSecure: 'ssl', smtpPasswordSet: false,
      imapHost: 'imappro.zoho.uk', imapPort: 993, imapMailbox: 'INBOX', imapPasswordSet: false,
    });
    expect(defaults.body.settings.source).toMatchObject({ smtpHost: 'default', smtpPassword: 'default', imapPassword: 'default' });

    const secret = `Zoho-App-${crypto.randomBytes(6).toString('hex')}`;
    const saved = await crm('PATCH', '/mail-settings', { smtpUser: 'admin@omnidevelopment.co.uk', smtpPassword: secret, imapUser: 'admin@omnidevelopment.co.uk', imapPassword: secret, smtpPort: 587, smtpSecure: 'tls', emailFrom: 'admin@omnidevelopment.co.uk' });
    expect(saved.status).toBe(200);
    expect(saved.body.settings).toMatchObject({ smtpUser: 'admin@omnidevelopment.co.uk', smtpPort: 587, smtpSecure: 'tls', smtpPasswordSet: true, imapPasswordSet: true });
    expect(saved.body.settings.source).toMatchObject({ smtpUser: 'database', smtpPassword: 'database', imapPassword: 'database', smtpHost: 'default' });
    const read = await crm('GET', '/mail-settings');
    for (const reply of [saved, read]) {
      expect(JSON.stringify(reply.body)).not.toContain(secret);
      expect(reply.body.settings).not.toHaveProperty('smtpPassword');
      expect(reply.body.settings).not.toHaveProperty('imapPassword');
    }

    // Stored encrypted (AES-256-GCM, key derived from the database credentials), never in plain text.
    const [rows] = await connection.query<mysql.RowDataPacket[]>("SELECT setting_value, is_public FROM site_settings WHERE setting_key = 'mail.smtp_password'");
    const stored = String(rows[0].setting_value);
    expect(stored.startsWith('v1:')).toBe(true);
    expect(stored).not.toContain(secret);
    expect(Number(rows[0].is_public)).toBe(0);
    const rawBytes = Buffer.from(stored.slice(3), 'base64');
    const key = crypto.createHash('sha256').update(`omni-crm-mail|${config.password}|${config.database}`).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, rawBytes.subarray(0, 12));
    decipher.setAuthTag(rawBytes.subarray(12, 28));
    expect(Buffer.concat([decipher.update(rawBytes.subarray(28)), decipher.final()]).toString()).toBe(secret);

    // '' keeps the stored password; null clears it.
    expect((await crm('PATCH', '/mail-settings', { smtpPassword: '' })).body.settings.smtpPasswordSet).toBe(true);
    const cleared = await crm('PATCH', '/mail-settings', { imapPassword: null });
    expect(cleared.body.settings).toMatchObject({ imapPasswordSet: false, smtpPasswordSet: true });
    expect(cleared.body.settings.source.imapPassword).toBe('default');
    expect((await crm('PATCH', '/mail-settings', { smtpSecure: 'starttls' })).status).toBe(400);

    // Config file / environment values win over the database.
    const pinned = await startPhp({ ...base, SMTP_HOST: 'smtp.pinned.test', SMTP_PASSWORD: 'from-config' });
    try {
      const cookie = owner; // sessions live in MySQL, so the same cookie works on every PHP server
      const view = await crm('GET', '/mail-settings', undefined, cookie, pinned);
      expect(view.body.settings).toMatchObject({ smtpHost: 'smtp.pinned.test', smtpUser: 'admin@omnidevelopment.co.uk', smtpPasswordSet: true });
      expect(view.body.settings.source).toMatchObject({ smtpHost: 'config', smtpPassword: 'config', smtpUser: 'database', imapHost: 'default' });
      expect(JSON.stringify(view.body)).not.toContain('from-config');
    } finally { await pinned.close(); }

    // Stored values feed the mail status; sending stays off until outboundEnabled is switched on.
    expect((await crm('GET', '/mail-status')).body.status).toMatchObject({ outboundEnabled: false, smtpConfigured: true, imapConfigured: false });
    const test = await crm('POST', '/mail-test', { to: 'someone@example.invalid' });
    expect(test.body.result).toMatchObject({ ok: false, stage: 'config' });
    const imap = await crm('POST', '/imap-test');
    expect(imap.body.result).toMatchObject({ ok: false, stage: 'config' });
    await connection.query("DELETE FROM site_settings WHERE setting_key LIKE 'mail.%'");
  });

  it('sends through SMTP (AUTH, envelope sender = mailbox, PDF attached), reports auth failures by stage, and clears sentAt when an emailed invoice is edited', async () => {
    const smtp = await startFakeSmtp({ user: smtpUser, password: smtpPassword });
    const mail = { OUTBOUND_MESSAGES_ENABLED: 'true', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.port), SMTP_SECURE: 'none', SMTP_USER: smtpUser, SMTP_PASSWORD: smtpPassword, EMAIL_FROM: 'sales@example.test', EMAIL_FROM_NAME: 'Omni Développements' };
    const server = await startPhp({ ...base, ...mail });
    try {
      const cookie = owner; // sessions live in MySQL, so the same cookie works on every PHP server
      const status = await crm('GET', '/mail-status', undefined, cookie, server);
      expect(status.body.status).toMatchObject({ outboundEnabled: true, smtpConfigured: true });

      const lead = await createLead();
      const quote = await crm('POST', '/quotes', { leadId: lead.id, title: 'Garage conversion', items: [{ description: 'Conversion', quantity: 1, unitPricePence: 1500000 }] }, cookie, server);
      const sent = await crm('POST', `/quotes/${quote.body.quote.id}/send`, { message: 'Thanks for your time today.' }, cookie, server);
      expect(sent.status).toBe(200);
      expect(sent.body.email).toMatchObject({ status: 'sent', error: '', from: 'sales@example.test', to: lead.email });
      expect(sent.body.email.sentAt).toBeTruthy();
      expect(sent.body.quote.emailedAt).toBeTruthy();

      const session = smtp.sessions.find(item => item.data.includes(quote.body.quote.reference))!;
      expect(session.auth).toBe(smtpUser);
      expect(session.mailFrom).toBe(`<${smtpUser}>`); // Zoho: envelope sender must be the signed-in mailbox
      expect(session.rcpt).toEqual([`<${lead.email}>`]);
      expect(session.data).toMatch(/^From: =\?UTF-8\?B\?[^\r\n]+<sales@example\.test>/m);
      expect(session.data).toContain('Content-Type: multipart/mixed');
      expect(session.data).toContain(`Content-Type: application/pdf; name="${quote.body.quote.reference}.pdf"`);
      expect(mimePart(session.data, 'Content-Type: application/pdf').subarray(0, 5).toString()).toBe('%PDF-');
      expect(mimePart(session.data, 'Content-Type: text/html').toString()).toContain('Thanks for your time today.');
      expect(mimePart(session.data, 'Content-Type: text/plain').toString()).toContain('/sign/');
      expect(session.data).not.toContain(smtpPassword);

      const test = await crm('POST', '/mail-test', { to: 'owner@example.invalid' }, cookie, server);
      expect(test.body.result).toEqual({ ok: true, stage: 'done', message: expect.stringContaining('owner@example.invalid') });
      expect(smtp.sessions.some(item => item.rcpt.includes('<owner@example.invalid>') && item.data.includes('Test email'))).toBe(true);

      // An emailed, issued invoice that is then edited needs re-sending: sentAt goes back to null.
      const invoice = await crm('POST', '/invoices', { leadId: lead.id, items: [{ description: 'Stage 1', quantity: 1, unitPricePence: 50000 }] }, cookie, server);
      const emailed = await crm('POST', `/invoices/${invoice.body.invoice.id}/send`, {}, cookie, server);
      expect(emailed.body.email.status).toBe('sent');
      expect(emailed.body.invoice.sentAt).toBeTruthy();
      const corrected = await crm('PATCH', `/invoices/${invoice.body.invoice.id}`, { items: [{ description: 'Stage 1 (revised)', quantity: 1, unitPricePence: 45000 }] }, cookie, server);
      expect(corrected.status).toBe(200);
      expect(corrected.body.invoice).toMatchObject({ status: 'issued', sentAt: null, amountPence: 45000 });

      // Replying to a customer's email threads it under the original (In-Reply-To / References) and links the lead.
      const inboundId = `<inbound-${runId}@customer.example>`;
      const [inserted] = await connection.execute<mysql.ResultSetHeader>(
        "INSERT INTO crm_emails (direction, lead_id, from_address, to_address, subject, body, status, message_id, received_at) VALUES ('inbound', ?, ?, 'sales@example.test', 'Question about the quote', '<p>Can we start in May?</p>', 'received', ?, UTC_TIMESTAMP())",
        [lead.id, lead.email, inboundId],
      );
      const reply = await crm('POST', '/emails', { replyToEmailId: inserted.insertId, to: lead.email, subject: 'Re: Question about the quote', body: 'Yes, May works.' }, cookie, server);
      expect(reply.status).toBe(201);
      expect(reply.body.email).toMatchObject({ status: 'sent', leadId: lead.id, to: lead.email });
      const replySession = smtp.sessions.find(item => item.data.includes('Subject: Re: Question about the quote'))!;
      expect(replySession).toBeTruthy();
      expect(mimePart(replySession.data, 'Content-Type: text/plain').toString()).toContain('Yes, May works.');
      expect(replySession.data).toContain(`In-Reply-To: ${inboundId}`);
      expect(replySession.data).toContain(`References: ${inboundId}`);
      expect((await crm('POST', '/emails', { replyToEmailId: 99999999, to: lead.email, subject: 'x', body: 'y' }, cookie, server)).status).toBe(404);
    } finally {
      await server.close();
      await smtp.close();
    }

    const rejecting = await startFakeSmtp({ user: smtpUser, password: smtpPassword, rejectAuth: true });
    const failing = await startPhp({ ...base, ...mail, SMTP_PORT: String(rejecting.port), SMTP_HOST: '127.0.0.1' });
    try {
      const cookie = owner; // sessions live in MySQL, so the same cookie works on every PHP server
      const test = await crm('POST', '/mail-test', { to: 'owner@example.invalid' }, cookie, failing);
      expect(test.body.result.ok).toBe(false);
      expect(test.body.result.stage).toBe('auth');
      expect(test.body.result.message).toContain('use an app-specific password');
      expect(test.body.result.message).not.toContain(smtpPassword);
      const lead = await createLead();
      const email = await crm('POST', '/emails', { leadId: lead.id, to: lead.email, subject: 'Hello', body: 'Hi' }, cookie, failing);
      expect(email.body.email.status).toBe('failed');
      expect(email.body.email.error).toContain('535');
      expect(email.body.email.error).not.toContain(smtpPassword);
    } finally {
      await failing.close();
      await rejecting.close();
    }

    const closedPort = await availablePort();
    const unreachable = await startPhp({ ...base, ...mail, SMTP_PORT: String(closedPort), IMAP_HOST: '127.0.0.1', IMAP_PORT: String(closedPort), IMAP_USER: 'x@example.test', IMAP_PASSWORD: 'imap-secret-value' });
    try {
      const cookie = owner; // sessions live in MySQL, so the same cookie works on every PHP server
      const smtpResult = (await crm('POST', '/mail-test', { to: 'owner@example.invalid' }, cookie, unreachable)).body.result;
      expect(smtpResult).toMatchObject({ ok: false, stage: 'connect' });
      const imapResult = (await crm('POST', '/imap-test', undefined, cookie, unreachable)).body.result;
      expect(imapResult.ok).toBe(false);
      expect(['connect', 'tls', 'config']).toContain(imapResult.stage);
      expect(JSON.stringify(imapResult)).not.toContain('imap-secret-value');
    } finally { await unreachable.close(); }
  });

  it('only exposes the cron endpoint with a long enough secret', async () => {
    expect((await call(php, '', 'GET', '/cron/crm?key=anything')).status).toBe(404);
    const cron = await startPhp({ ...base, CRM_CRON_SECRET: cronSecret });
    try {
      expect((await call(cron, '', 'GET', `/cron/crm?key=${cronSecret}x`)).status).toBe(404);
      expect((await call(cron, '', 'GET', '/cron/crm')).status).toBe(404);
      const ok = await call(cron, '', 'GET', `/cron/crm?key=${cronSecret}`);
      expect(ok.status).toBe(200);
      expect(ok.body.result.followups).toEqual({ sent: expect.any(Number), failed: expect.any(Number), cancelled: expect.any(Number) });
      expect(ok.body.result.sync.status).toBe('not-configured');
    } finally { await cron.close(); }
    const short = await startPhp({ ...base, CRM_CRON_SECRET: 'too-short' });
    try {
      expect((await call(short, '', 'GET', '/cron/crm?key=too-short')).status).toBe(404);
    } finally { await short.close(); }
  });

  it('requires a staff session for every sales route', async () => {
    for (const route of ['/quotes/1/pdf', '/emails', '/email-templates', '/followups', '/mail-status', '/mail-settings', '/settings']) {
      expect((await crm('GET', route, undefined, '')).status).toBe(401);
    }
    expect((await crm('POST', '/mail-test', { to: 'a@b.c' }, '')).status).toBe(401);
  });
});
