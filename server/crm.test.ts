import type { Server } from 'node:http';
import type { Express } from 'express';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CrmError, CrmService, MemoryCrmStore, advancedStage, csvCell, csvDocument, isoDateTime, mapWordPressFields, verifyWebhook, webhookSignature } from './crm';
import type { TeamMemberPatch } from './crm';

const SECRET = 'test-webhook-secret-0123456789abcdef0123456789';

describe('pipeline stage rules', () => {
  it('only moves leads forward and never out of won or lost', () => {
    expect(advancedStage('new', 'site_visit')).toBe('site_visit');
    expect(advancedStage('quoted', 'contacted')).toBeNull();
    expect(advancedStage('won', 'quoted')).toBeNull();
    expect(advancedStage('lost', 'site_visit')).toBeNull();
  });
});

describe('webhook signatures', () => {
  const now = 1_800_000_000;
  const body = '{"externalId":"x"}';
  const signature = `sha256=${webhookSignature(SECRET, String(now), body)}`;
  it('accepts a fresh, correctly signed body', () => expect(verifyWebhook(SECRET, String(now), signature, body, now + 10)).toBe(true));
  it('rejects tampered bodies, stale timestamps and short secrets', () => {
    expect(verifyWebhook(SECRET, String(now), signature, `${body} `, now)).toBe(false);
    expect(verifyWebhook(SECRET, String(now), signature, body, now + 301)).toBe(false);
    expect(verifyWebhook('short', String(now), signature, body, now)).toBe(false);
  });
});

describe('WordPress field mapping', () => {
  it('maps the live Elementor "Full quote" form fields', () => {
    expect(mapWordPressFields({ name: 'Sam Example', email: 'sam@example.invalid', phone: '07000 000000', postcode: 'm1 1aa', project: 'Kitchen renovation', property: 'Semi-detached', start: 'Within 3 months', budget: '£20k–£40k', plans: 'Yes', message: 'New kitchen', contact_pref: 'Phone', consent: 'on', step1: '' }))
      .toMatchObject({ name: 'Sam Example', email: 'sam@example.invalid', postcode: 'm1 1aa', projectType: 'Kitchen renovation', propertyType: 'Semi-detached', desiredStart: 'Within 3 months', preferredContact: 'Phone', description: 'New kitchen', plans: 'Yes' });
  });
  it('joins first and last names when there is no single name field', () => {
    expect(mapWordPressFields({ 'First Name': 'Ana', 'Last Name': 'Jones', Email: 'a@example.invalid' }).name).toBe('Ana Jones');
  });
});

describe('CRM service (in-memory store)', () => {
  let crm: CrmService;
  const contacts: Array<{ reference: string; name: string; email: string; phone: string; message: string; createdAt: string }> = [];
  beforeEach(() => {
    contacts.length = 0;
    crm = new CrmService(new MemoryCrmStore({ contacts: () => contacts, quotes: () => [] }));
  });

  it('imports website enquiries once and keeps their reference', async () => {
    contacts.push({ reference: 'ENQ-ABC', name: 'Web Visitor', email: 'web@example.invalid', phone: '0161 000 0000', message: 'Loft conversion please', createdAt: new Date().toISOString() });
    expect((await crm.listLeads({})).map(lead => lead.reference)).toEqual(['ENQ-ABC']);
    expect(await crm.listLeads({})).toHaveLength(1);
    expect((await crm.summary()).newThisWeek).toBe(1);
  });

  it('requires a name and a phone or email for manual leads', async () => {
    await expect(crm.createLead({ name: 'No contact' }, null)).rejects.toBeInstanceOf(CrmError);
    await expect(crm.createLead({ name: '', phone: '0161' }, null)).rejects.toThrow('Enter the customer name.');
  });

  it('runs a lead from enquiry to paid invoice, advancing the stage and recording history', async () => {
    const lead = await crm.createLead({ name: 'Pat Customer', phone: '07000 000001', postcode: 'SK7 1AA', valuePence: 2_500_000 }, null);
    expect(lead).toMatchObject({ stage: 'new', source: 'manual', valuePence: 2_500_000 });

    await crm.addActivity(lead.id, { kind: 'call', body: 'Called, wants a visit next week.' }, null);
    expect((await crm.getLead(lead.id)).lead.stage).toBe('contacted');

    const visit = await crm.createVisit({ leadId: lead.id, scheduledAt: '2030-01-10T10:00:00.000Z' }, null);
    expect(visit).toMatchObject({ leadName: 'Pat Customer', status: 'scheduled', scheduledAt: '2030-01-10T10:00:00.000Z', durationMinutes: 60 });
    expect((await crm.getLead(lead.id)).lead.stage).toBe('site_visit');
    await crm.updateVisit(visit.id, { status: 'completed' }, null);

    const task = await crm.createTask({ leadId: lead.id, title: 'Price up structural steel', dueAt: '2000-01-01T09:00:00.000Z' }, null);
    expect((await crm.summary()).overdueTasks).toBe(1);
    const done = await crm.updateTask(task.id, { status: 'completed' }, null);
    expect(done.completedAt).not.toBeNull();
    expect((await crm.summary()).overdueTasks).toBe(0);

    const quote = await crm.createQuote({ leadId: lead.id, title: 'Rear extension', amountPence: 3_200_000 }, null);
    expect(quote.reference).toBe('Q-0001');
    await crm.updateQuote(quote.id, { status: 'sent' }, null);
    expect((await crm.getLead(lead.id)).lead.stage).toBe('quoted');
    expect((await crm.summary()).quotesSentPence).toBe(3_200_000);
    await crm.updateQuote(quote.id, { status: 'accepted' }, null);
    expect((await crm.getLead(lead.id)).lead.stage).toBe('won');

    const invoice = await crm.createInvoice({ quoteId: quote.id, amountPence: 1_000_000, status: 'issued', dueAt: '2000-02-01' }, null);
    expect(invoice).toMatchObject({ reference: 'INV-0001', leadId: lead.id, customerName: 'Pat Customer', status: 'issued' });
    let summary = await crm.summary();
    expect(summary).toMatchObject({ invoicesOutstandingPence: 1_000_000, overdueInvoices: 1, conversionRate: 100 });
    const paid = await crm.updateInvoice(invoice.id, { status: 'paid' }, null);
    expect(paid.paidAt).not.toBeNull();
    summary = await crm.summary();
    expect(summary).toMatchObject({ invoicesOutstandingPence: 0, invoicesPaidPence: 1_000_000, overdueInvoices: 0 });

    const detail = await crm.getLead(lead.id);
    expect(detail.visits).toHaveLength(1);
    expect(detail.quotes).toHaveLength(1);
    expect(detail.invoices).toHaveLength(1);
    const history = detail.activities.map(activity => activity.body).join('\n');
    for (const fragment of ['Lead added by staff.', 'Stage changed from New to Contacted', 'Site visit booked', 'Site visit completed.', 'Task completed: Price up structural steel.', 'Quote Q-0001', 'to Won (quote accepted)', 'Invoice INV-0001 marked paid']) expect(history).toContain(fragment);
  });

  it('lets staff move a lead to any stage, including back from lost, and keeps the reason', async () => {
    const lead = await crm.createLead({ name: 'Lee', email: 'lee@example.invalid' }, null);
    expect((await crm.updateLead(lead.id, { stage: 'lost', lostReason: 'Went with another builder' }, null)).stage).toBe('lost');
    const detail = await crm.getLead(lead.id);
    expect(detail.lead.lostReason).toBe('Went with another builder');
    expect(detail.activities[0]?.body).toContain('to Lost (Went with another builder)');
    expect((await crm.updateLead(lead.id, { stage: 'contacted' }, null)).stage).toBe('contacted');
  });

  it('ingests WordPress submissions idempotently by external id', async () => {
    const payload = { externalId: 'elementor:omnidevelopment.co.uk:1', form: 'Full quote', page: 'Contact', submittedAt: '2026-10-28T16:17:46Z', fields: { name: 'Elementor Lead', email: 'LEAD@Example.invalid', phone: '07111 111111', postcode: 'm20 2aa', project: 'Loft conversion', message: 'Dormer loft' } };
    expect(await crm.ingestWordPress(payload)).toMatchObject({ created: true });
    expect(await crm.ingestWordPress(payload)).toMatchObject({ created: false });
    const [lead] = await crm.listLeads({});
    expect(lead).toMatchObject({ source: 'wordpress', name: 'Elementor Lead', email: 'lead@example.invalid', postcode: 'M20 2AA', projectType: 'Loft conversion', createdAt: '2026-10-28T16:17:46.000Z' });
    expect((await crm.getLead(lead!.id)).lead.submission).toMatchObject({ project: 'Loft conversion' });
  });

  it('reads MySQL-style UTC datetimes as UTC', () => {
    expect(isoDateTime('2026-11-03 09:30:00')).toBe('2026-11-03T09:30:00.000Z');
    expect(isoDateTime(new Date('2026-11-03T09:30:00Z'))).toBe('2026-11-03T09:30:00.000Z');
  });

  it('flags a repeat enquirer who shares an email address or a phone number', async () => {
    const first = await crm.createLead({ name: 'Repeat Customer', email: 'repeat@example.invalid', phone: '07111 111111' }, null);
    const second = await crm.createLead({ name: 'Repeat Customer', email: 'REPEAT@example.invalid', phone: '+44 7111 111111' }, null);
    const other = await crm.createLead({ name: 'Someone Else', email: 'other@example.invalid', phone: '0161 999 9999' }, null);
    const leads = await crm.listLeads({});
    expect(leads.find(lead => lead.id === second.id)?.possibleDuplicates).toEqual([{ id: first.id, name: 'Repeat Customer', reference: first.reference }]);
    expect(leads.find(lead => lead.id === other.id)?.possibleDuplicates).toEqual([]);
    expect((await crm.getLead(second.id)).lead.possibleDuplicates.map(duplicate => duplicate.id)).toEqual([first.id]);
    expect((await crm.getLead(first.id)).lead.possibleDuplicates.map(duplicate => duplicate.id)).toEqual([second.id]);
  });
});

describe('CRM team management', () => {
  const manager = { id: 99, role: 'owner' };
  let store: SpyStore;
  let crm: CrmService;

  class SpyStore extends MemoryCrmStore {
    cleared: number[] = [];
    patches: Array<{ id: number; patch: TeamMemberPatch }> = [];
    inserts: Array<Parameters<MemoryCrmStore['insertUser']>[0]> = [];
    override async insertUser(input: Parameters<MemoryCrmStore['insertUser']>[0]) {
      this.inserts.push(input);
      return super.insertUser(input);
    }
    override async updateUser(id: number, patch: TeamMemberPatch) {
      this.patches.push({ id, patch });
      return super.updateUser(id, patch);
    }
    override async clearUserSessions(id: number) {
      this.cleared.push(id);
      return super.clearUserSessions(id);
    }
  }

  beforeEach(() => {
    store = new SpyStore();
    crm = new CrmService(store);
  });

  const invite = (overrides: Partial<{ name: string; email: string; role: 'owner' | 'admin' | 'staff'; password: string }> = {}) =>
    crm.createTeamMember({ name: 'Nina Patel', email: 'Nina@Example.invalid', role: 'staff', password: 'correct horse battery', ...overrides }, manager);

  it('creates a team member with a hashed password and a lower-cased email', async () => {
    const member = await invite();
    expect(member).toMatchObject({ name: 'Nina Patel', email: 'nina@example.invalid', role: 'staff', isActive: true });
    expect(member).not.toHaveProperty('passwordHash');
    expect((await crm.team(manager)).map(entry => entry.email)).toEqual(['nina@example.invalid']);
    expect((await crm.staff()).map(entry => entry.name)).toContain('Nina Patel');
    const created = store.inserts[0];
    expect(created?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(created?.passwordHash).not.toContain('correct horse battery');
    expect(await bcrypt.compare('correct horse battery', String(created?.passwordHash))).toBe(true);
  });

  it('rejects duplicate emails and passwords shorter than 12 characters', async () => {
    await invite();
    await expect(invite({ role: 'admin' })).rejects.toMatchObject({ status: 409 });
    await expect(invite({ email: 'other@example.invalid', password: 'too-short' })).rejects.toMatchObject({ status: 400 });
    await expect(crm.createTeamMember({ name: 'No Email', role: 'staff', password: 'correct horse battery' }, manager)).rejects.toMatchObject({ status: 400 });
  });

  it('only lets owners and administrators manage the team', async () => {
    const member = await invite();
    const staffActor = { id: member.id, role: 'staff' };
    await expect(crm.team(staffActor)).rejects.toMatchObject({ status: 403 });
    await expect(crm.createTeamMember({ name: 'Blocked', email: 'blocked@example.invalid', role: 'staff', password: 'correct horse battery' }, staffActor)).rejects.toMatchObject({ status: 403 });
    await expect(crm.updateTeamMember(member.id, { role: 'admin' }, staffActor)).rejects.toMatchObject({ status: 403 });
    await expect(crm.resetTeamPassword(member.id, { password: 'correct horse battery' }, staffActor)).rejects.toMatchObject({ status: 403 });
  });

  it('deactivates an account, ends its sessions and drops it from the assignment list', async () => {
    const member = await invite();
    const updated = await crm.updateTeamMember(member.id, { isActive: false }, manager);
    expect(updated.isActive).toBe(false);
    expect(store.cleared).toContain(member.id);
    expect((await crm.staff()).map(entry => entry.name)).not.toContain('Nina Patel');
    expect((await crm.team(manager)).find(entry => entry.id === member.id)?.isActive).toBe(false);
  });

  it('refuses to let a manager remove their own access or strand the last owner', async () => {
    const first = await invite({ role: 'owner', email: 'first@example.invalid' });
    await expect(crm.updateTeamMember(first.id, { role: 'admin' }, { id: first.id, role: 'owner' })).rejects.toMatchObject({ status: 400 });
    await expect(crm.updateTeamMember(first.id, { isActive: false }, { id: first.id, role: 'owner' })).rejects.toMatchObject({ status: 400 });
    // The only owner cannot step down, even when someone else asks.
    await expect(crm.updateTeamMember(first.id, { role: 'admin' }, manager)).rejects.toMatchObject({ status: 400 });
    const second = await invite({ role: 'owner', email: 'second@example.invalid' });
    expect((await crm.updateTeamMember(first.id, { role: 'admin' }, manager)).role).toBe('admin');
    // Now `second` is the last owner, so its own demotion is refused until `first` is promoted again.
    await expect(crm.updateTeamMember(second.id, { role: 'admin' }, manager)).rejects.toMatchObject({ status: 400 });
    expect((await crm.updateTeamMember(first.id, { role: 'owner' }, manager)).role).toBe('owner');
    expect((await crm.updateTeamMember(second.id, { role: 'admin' }, manager)).role).toBe('admin');
    await expect(crm.updateTeamMember(first.id, { isActive: false }, manager)).rejects.toMatchObject({ status: 400 });
    expect((await crm.updateTeamMember(first.id, { name: 'First Owner' }, manager)).name).toBe('First Owner');
  });

  it('resets a password with a bcrypt hash and signs the account out everywhere', async () => {
    const member = await invite();
    expect(await crm.resetTeamPassword(member.id, { password: 'a whole new passphrase' }, manager)).toEqual({ id: member.id, sessionsCleared: true });
    const hash = String(store.patches[store.patches.length - 1]?.patch.passwordHash || '');
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash).not.toContain('a whole new passphrase');
    expect(await bcrypt.compare('a whole new passphrase', hash)).toBe(true);
    expect(store.cleared).toContain(member.id);
    await expect(crm.resetTeamPassword(member.id, { password: 'short' }, manager)).rejects.toMatchObject({ status: 400 });
    await expect(crm.resetTeamPassword(9999, { password: 'a whole new passphrase' }, manager)).rejects.toMatchObject({ status: 404 });
  });
});

describe('CRM lead attachments', () => {
  class FileStore extends MemoryCrmStore {
    override async quoteFiles(quoteRequestId: number) {
      return quoteRequestId === 7
        ? [{ id: 11, storedFilename: 'abc123.pdf', originalFilename: 'Plans and drawings.pdf', mimeType: 'application/pdf', sizeBytes: 2048, createdAt: '2026-11-01T10:00:00.000Z' }]
        : [];
    }
    override async quoteFile(quoteRequestId: number, fileId: number) {
      return (await this.quoteFiles(quoteRequestId)).find(file => file.id === fileId) || null;
    }
  }

  let store: FileStore;
  let crm: CrmService;
  let quotedLead = 0;
  let manualLead = 0;

  beforeEach(async () => {
    store = new FileStore();
    crm = new CrmService(store);
    quotedLead = await store.insert('crm_leads', { public_reference: 'QTE-FILE-1', source: 'website_quote', quote_request_id: 7, name: 'Quote Uploader', email: 'uploader@example.invalid' });
    manualLead = await store.insert('crm_leads', { public_reference: 'LEAD-FILE-2', source: 'manual', name: 'Manual Lead', phone: '0161 000 0000' });
  });

  it('lists the drawings uploaded with the website quote request', async () => {
    const detail = await crm.getLead(quotedLead);
    expect(detail.files).toEqual([{ id: 11, originalFilename: 'Plans and drawings.pdf', mimeType: 'application/pdf', sizeBytes: 2048, createdAt: '2026-11-01T10:00:00.000Z' }]);
    // The on-disk name is never exposed to the browser.
    expect(JSON.stringify(detail.files)).not.toContain('abc123.pdf');
    expect((await crm.getLead(manualLead)).files).toEqual([]);
  });

  it('only serves a file through the lead that owns it', async () => {
    expect(await crm.leadFile(quotedLead, 11)).toMatchObject({ storedFilename: 'abc123.pdf', originalFilename: 'Plans and drawings.pdf', mimeType: 'application/pdf' });
    await expect(crm.leadFile(manualLead, 11)).rejects.toMatchObject({ status: 404 });
    await expect(crm.leadFile(quotedLead, 99)).rejects.toMatchObject({ status: 404 });
    await expect(crm.leadFile(9999, 11)).rejects.toMatchObject({ status: 404 });
  });
});

describe('CRM exports and erasure', () => {
  let crm: CrmService;
  beforeEach(() => { crm = new CrmService(new MemoryCrmStore()); });

  it('quotes CSV cells the way RFC 4180 expects', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('Smith, John')).toBe('"Smith, John"');
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
    expect(csvCell(null)).toBe('');
    const document = csvDocument(['Name', 'Note'], [['Smith, John', 'line one\nline two']]);
    expect(document.startsWith('\uFEFF')).toBe(true);
    expect(document).toContain('\r\n');
    expect(document.endsWith('\r\n')).toBe(true);
    expect(document).toContain('"Smith, John","line one\nline two"');
  });

  it('exports filtered leads and invoices as CSV', async () => {
    const lead = await crm.createLead({ name: 'Smith, John', email: 'js@example.invalid', valuePence: 125050 }, null);
    await crm.createLead({ name: 'Staying Lead', phone: '0161 000 0000' }, null);
    const leads = await crm.exportLeads({ stage: 'new' });
    expect(leads).toContain('Reference,Name,Email');
    expect(leads).toContain('"Smith, John"');
    expect(leads).toContain('1250.50');
    expect((await crm.exportLeads({ q: 'nobody' })).trim().split('\r\n')).toHaveLength(1);
    await crm.createInvoice({ leadId: lead.id, amountPence: 50000, status: 'issued' }, null);
    const invoices = await crm.exportInvoices({ status: 'issued' });
    expect(invoices).toContain('500.00');
    expect(invoices).toContain('Smith, John');
  });

  it('deletes a lead with no commercial history and anonymises one that has invoices', async () => {
    const plain = await crm.createLead({ name: 'No History', email: 'gone@example.invalid' }, null);
    expect(await crm.eraseLead(plain.id, null)).toEqual({ id: plain.id, erased: 'deleted' });
    await expect(crm.getLead(plain.id)).rejects.toMatchObject({ status: 404 });

    const kept = await crm.createLead({ name: 'Keep Me', email: 'keep@example.invalid', postcode: 'M1 1AA', address: '1 Test Street', description: 'Loft conversion' }, null);
    const invoice = await crm.createInvoice({ leadId: kept.id, amountPence: 10000, status: 'issued' }, null);
    expect(await crm.eraseLead(kept.id, null)).toEqual({ id: kept.id, erased: 'anonymised' });
    const detail = await crm.getLead(kept.id);
    expect(detail.lead).toMatchObject({ name: 'Personal data erased', email: '', phone: '', postcode: '', address: '', description: '' });
    expect(detail.invoices).toHaveLength(1);
    expect(detail.invoices[0]).toMatchObject({ id: invoice.id, amountPence: 10000 });
    expect(detail.activities.map(activity => activity.body).join(' ')).toContain('Personal data erased at the customer');
  });

  it('rejects erasure for a lead that does not exist', async () => {
    await expect(crm.eraseLead(9999, null)).rejects.toMatchObject({ status: 404 });
  });
});

describe('CRM HTTP API (development server, no database)', () => {
  const managed = ['NODE_ENV', 'DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD', 'ADMIN_EMAIL', 'ADMIN_PASSWORD_HASH', 'CRM_WEBHOOK_SECRET'] as const;
  const original = Object.fromEntries(managed.map(key => [key, process.env[key]]));
  let server: Server;
  let baseUrl = '';
  let cookie = '';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    for (const key of ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD'] as const) process.env[key] = '';
    process.env.ADMIN_EMAIL = 'staff@example.invalid';
    process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('correct horse battery', 4);
    process.env.CRM_WEBHOOK_SECRET = SECRET;
    vi.resetModules();
    const app = (await import('./server.js')).default as unknown as Express;
    await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', () => resolve()); });
    const address = server.address();
    baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
    const login = await fetch(`${baseUrl}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'staff@example.invalid', password: 'correct horse battery' }) });
    cookie = String(login.headers.get('set-cookie') || '').split(';')[0] || '';
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    for (const key of managed) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; }
  });

  const api = (path: string, init: RequestInit = {}) => fetch(`${baseUrl}/api/admin/crm${path}`, { ...init, headers: { 'Content-Type': 'application/json', Cookie: cookie, ...(init.headers || {}) } });

  it('requires a staff session', async () => {
    expect((await fetch(`${baseUrl}/api/admin/crm/leads`)).status).toBe(401);
  });

  it('creates, updates and lists leads over HTTP', async () => {
    const created = await api('/leads', { method: 'POST', body: JSON.stringify({ name: 'HTTP Lead', phone: '0161 111 1111' }) });
    expect(created.status).toBe(201);
    const { lead } = await created.json() as { lead: { id: number } };
    const patched = await api(`/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify({ stage: 'contacted' }) });
    expect((await patched.json() as { lead: { stage: string } }).lead.stage).toBe('contacted');
    const invalid = await api('/visits', { method: 'POST', body: JSON.stringify({ leadId: lead.id, scheduledAt: 'not a date' }) });
    expect(invalid.status).toBe(400);
    const list = await (await api('/leads?stage=contacted')).json() as { records: Array<{ name: string }> };
    expect(list.records.map(record => record.name)).toContain('HTTP Lead');
    expect((await api('/leads/999999')).status).toBe(404);
  });

  it('manages the team over HTTP for an owner', async () => {
    const created = await api('/team', { method: 'POST', body: JSON.stringify({ name: 'Http Staff', email: 'Http.Staff@Example.invalid', role: 'staff', password: 'correct horse battery' }) });
    expect(created.status).toBe(201);
    const { member } = await created.json() as { member: { id: number; email: string; role: string; isActive: boolean } };
    expect(member).toMatchObject({ email: 'http.staff@example.invalid', role: 'staff', isActive: true });
    const list = await (await api('/team')).json() as { team: Array<{ email: string }> };
    expect(list.team.map(entry => entry.email)).toContain('http.staff@example.invalid');
    const patched = await api(`/team/${member.id}`, { method: 'PATCH', body: JSON.stringify({ role: 'admin', isActive: false }) });
    expect(await patched.json() as object).toMatchObject({ member: { role: 'admin', isActive: false } });
    expect((await api(`/team/${member.id}/password`, { method: 'POST', body: JSON.stringify({ password: 'short' }) })).status).toBe(400);
    expect((await api('/team', { method: 'POST', body: JSON.stringify({ name: 'No Password', email: 'nopass@example.invalid', role: 'staff' }) })).status).toBe(400);
  });

  it('exports CSV and erases a lead over HTTP', async () => {
    const created = await api('/leads', { method: 'POST', body: JSON.stringify({ name: 'CSV Lead', phone: '0161 222 2222' }) });
    const { lead } = await created.json() as { lead: { id: number } };
    const response = await api('/leads.csv');
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(String(response.headers.get('content-disposition'))).toContain('attachment');
    const bytes = new Uint8Array(await response.arrayBuffer());
    // The UTF-8 BOM Excel needs, then the header row.
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const body = new TextDecoder().decode(bytes);
    expect(body.startsWith('Reference,Name')).toBe(true);
    expect(body).toContain('CSV Lead');
    expect(body).toContain('\r\n');
    expect((await api('/invoices.csv')).status).toBe(200);
    const erased = await api(`/leads/${lead.id}`, { method: 'DELETE' });
    expect(await erased.json() as object).toEqual({ result: { id: lead.id, erased: 'deleted' } });
    expect((await api(`/leads/${lead.id}`)).status).toBe(404);
  });

  it('accepts signed WordPress webhooks and rejects unsigned ones', async () => {
    const body = JSON.stringify({ externalId: 'elementor:test:42', form: 'Full quote', fields: { name: 'Webhook Lead', email: 'hook@example.invalid' } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const send = (signature: string) => fetch(`${baseUrl}/api/integrations/wordpress/lead`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Omni-Timestamp': timestamp, 'X-Omni-Signature': signature }, body });
    expect((await send('sha256=' + '0'.repeat(64))).status).toBe(401);
    expect((await send(`sha256=${webhookSignature(SECRET, timestamp, body)}`)).status).toBe(201);
    expect((await send(`sha256=${webhookSignature(SECRET, timestamp, body)}`)).status).toBe(200);
    const list = await (await api('/leads?q=webhook')).json() as { records: Array<{ source: string }> };
    expect(list.records).toEqual([expect.objectContaining({ source: 'wordpress' })]);
  });
});
