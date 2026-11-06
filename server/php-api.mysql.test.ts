import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applyAuthoritativeMigrations, availablePort, requiredTestDatabase, type DbConfig } from './mysql.test-support';

/*
 * Exercises the PHP API that the Hostinger shared-hosting package runs, through php-cgi (one process per
 * request, as on the host) against a real, disposable MySQL database. Nothing is mocked.
 * Requires PHP_CGI_BINARY (php-cgi 8.1+ with pdo_mysql and fileinfo) plus the TEST_DATABASE_* settings.
 */

const script = path.resolve('php', 'api', 'index.php');

function requiredPhpCgi() {
  const binary = process.env.PHP_CGI_BINARY;
  if (!binary) throw new Error('PHP API verification requires PHP_CGI_BINARY (path to php-cgi). No test was skipped.');
  return binary;
}

type PhpServer = { baseUrl: string; close: () => Promise<void> };

async function startPhp(settings: Record<string, string>): Promise<PhpServer> {
  const binary = requiredPhpCgi();
  const phpIni = process.env.PHP_INI_FILE;
  const port = await availablePort();
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk as Buffer));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const url = new URL(req.url || '/', 'http://local');
      const env: Record<string, string> = {
        ...(process.env as Record<string, string>),
        ...settings,
        GATEWAY_INTERFACE: 'CGI/1.1', SERVER_PROTOCOL: 'HTTP/1.1', REDIRECT_STATUS: '200',
        REQUEST_METHOD: req.method || 'GET', SCRIPT_FILENAME: script, SCRIPT_NAME: '/api/index.php',
        REQUEST_URI: req.url || '/', QUERY_STRING: url.pathname === '/health' ? 'resource=health' : url.search.slice(1),
        CONTENT_LENGTH: String(body.length), CONTENT_TYPE: String(req.headers['content-type'] || ''),
        REMOTE_ADDR: '127.0.0.1', SERVER_NAME: '127.0.0.1', SERVER_PORT: String(port),
      };
      for (const [key, value] of Object.entries(req.headers)) env[`HTTP_${key.toUpperCase().replace(/-/g, '_')}`] = Array.isArray(value) ? value.join(', ') : String(value);
      const child = spawn(binary, phpIni ? ['-c', phpIni] : [], { env, cwd: path.dirname(script) });
      const output: Buffer[] = [];
      child.stdout.on('data', chunk => output.push(chunk as Buffer));
      child.on('close', () => {
        const raw = Buffer.concat(output);
        let split = raw.indexOf('\r\n\r\n');
        let separator = 4;
        if (split < 0) { split = raw.indexOf('\n\n'); separator = 2; }
        const head = split < 0 ? '' : raw.subarray(0, split).toString();
        let status = 200;
        const headers: Record<string, string | string[]> = {};
        for (const line of head.split(/\r?\n/)) {
          const index = line.indexOf(':');
          if (index < 0) continue;
          const name = line.slice(0, index).trim();
          const value = line.slice(index + 1).trim();
          if (name.toLowerCase() === 'status') status = parseInt(value, 10);
          else if (name.toLowerCase() === 'set-cookie') headers['set-cookie'] = [...((headers['set-cookie'] as string[]) || []), value];
          else headers[name] = value;
        }
        res.writeHead(status, headers);
        res.end(split < 0 ? raw : raw.subarray(split + separator));
      });
      child.stdin.end(body);
    });
  });
  await new Promise<void>(resolve => server.listen(port, '127.0.0.1', resolve));
  return { baseUrl: `http://127.0.0.1:${port}`, close: () => new Promise(resolve => server.close(() => resolve())) };
}

const databaseSettings = (config: DbConfig) => ({
  DATABASE_HOST: config.host, DATABASE_PORT: String(config.port), DATABASE_NAME: config.database,
  DATABASE_USER: config.user, DATABASE_PASSWORD: config.password,
});
const emptyDatabase = { DATABASE_HOST: '', DATABASE_PORT: '', DATABASE_NAME: '', DATABASE_USER: '', DATABASE_PASSWORD: '' };
const noBootstrap = { BOOTSTRAP_ADMIN_NAME: '', BOOTSTRAP_ADMIN_EMAIL: '', BOOTSTRAP_ADMIN_PASSWORD: '' };
// The PHP rate limiter keeps its buckets in the system temp directory for 15 minutes, across test runs.
// Every request therefore gets a random client address so neither tests nor repeated runs share a bucket.
const clientAddress = () => `10.${[...crypto.randomBytes(3)].join('.')}`;

async function login(baseUrl: string, email: string, password: string, address = clientAddress()) {
  return await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': address },
    body: JSON.stringify({ email, password }),
  });
}
const sessionCookie = (response: Response) => String(response.headers.get('set-cookie') || '').split(';', 1)[0];
const adminReadRoutes = ['session', 'summary', 'leads', 'quotes', 'projects', 'site-visits', 'calendar', 'tasks', 'invoices'];

describe('PHP API without a usable database', () => {
  it('reports missing configuration with staff-specific messages and never stores enquiries elsewhere', async () => {
    const php = await startPhp({ ...emptyDatabase, ...noBootstrap, COOKIE_SECURE: 'false', STAGING_MODE: 'false', TRUST_PROXY: '1' });
    try {
      const health = await fetch(`${php.baseUrl}/health`);
      expect(health.status).toBe(503);
      expect(await health.json()).toMatchObject({ status: 'degraded', database: 'not-configured' });

      const signIn = await login(php.baseUrl, 'owner@example.invalid', 'not-the-password-123');
      expect(signIn.status).toBe(503);
      expect(await signIn.json()).toEqual({ message: 'Staff access has not been configured.' });

      const contact = await fetch(`${php.baseUrl}/api/contact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': clientAddress() },
        body: JSON.stringify({ name: 'QA', email: 'qa@example.invalid', phone: '07000000000', message: 'Missing database behaviour check.', preferredContact: 'Email', consent: true }),
      });
      expect(contact.status).toBe(503);
      expect(await contact.json()).toEqual({ message: "We couldn't send your enquiry, please call or email us." });
    } finally { await php.close(); }
  });

  it('reports an unreachable database as temporarily unavailable', async () => {
    const closedPort = await availablePort();
    const php = await startPhp({ ...noBootstrap, DATABASE_HOST: '127.0.0.1', DATABASE_PORT: String(closedPort), DATABASE_NAME: 'omni_unreachable_test', DATABASE_USER: 'nobody', DATABASE_PASSWORD: 'nothing', COOKIE_SECURE: 'false', TRUST_PROXY: '1' });
    try {
      const health = await fetch(`${php.baseUrl}/api/health`);
      expect(health.status).toBe(503);
      expect(await health.json()).toMatchObject({ database: 'unavailable' });
      const signIn = await login(php.baseUrl, 'owner@example.invalid', 'not-the-password-123');
      expect(signIn.status).toBe(503);
      const body = await signIn.json() as { message: string };
      expect(body).toEqual({ message: 'The staff system is temporarily unavailable. Please contact the administrator.' });
      expect(JSON.stringify(body)).not.toContain('nothing');
    } finally { await php.close(); }
  });
});

describe('PHP API with MySQL', () => {
  const config = requiredTestDatabase();
  const runId = crypto.randomUUID().split('-').join('').slice(0, 12);
  const ownerEmail = `qa-owner-${runId}@example.invalid`;
  const ownerPassword = crypto.randomBytes(18).toString('base64url');
  const contactEmail = `qa-contact-${runId}@example.invalid`;
  const quoteEmail = `qa-quote-${runId}@example.invalid`;
  let connection: mysql.Connection;
  let uploadRoot: string;
  let settings: Record<string, string>;

  beforeAll(async () => {
    connection = await mysql.createConnection({ ...config, multipleStatements: true });
    await applyAuthoritativeMigrations(connection);
    await applyAuthoritativeMigrations(connection); // migrations must be repeatable
    // Disposable database only (guarded by requiredTestDatabase): start with no administrator so bootstrap is exercised.
    await connection.query("DELETE FROM users WHERE role IN ('owner','admin')");
    uploadRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'omni-php-api-'));
    settings = { ...databaseSettings(config), UPLOAD_DIR: path.join(uploadRoot, 'private'), PROJECT_UPLOAD_DIR: path.join(uploadRoot, 'projects'), COOKIE_SECURE: 'false', STAGING_MODE: 'false', TRUST_PROXY: '1' };
  });

  afterAll(async () => {
    await connection.execute('DELETE FROM contact_enquiries WHERE email = ?', [contactEmail]).catch(() => undefined);
    await connection.execute('DELETE FROM quote_requests WHERE email = ?', [quoteEmail]).catch(() => undefined);
    await connection.execute('DELETE FROM users WHERE email = ?', [ownerEmail]).catch(() => undefined);
    await connection.end();
    await fs.rm(uploadRoot, { recursive: true, force: true });
  });

  it('refuses staff sign-in until a bootstrap administrator is configured', async () => {
    const php = await startPhp({ ...settings, ...noBootstrap });
    try {
      const signIn = await login(php.baseUrl, ownerEmail, ownerPassword);
      expect(signIn.status).toBe(503);
      expect(await signIn.json()).toEqual({ message: 'Staff access has not been configured.' });
    } finally { await php.close(); }
  });

  it('bootstraps one hashed administrator, signs in and keeps the session in MySQL', async () => {
    const php = await startPhp({ ...settings, BOOTSTRAP_ADMIN_NAME: 'QA Owner', BOOTSTRAP_ADMIN_EMAIL: ownerEmail, BOOTSTRAP_ADMIN_PASSWORD: ownerPassword, COOKIE_SECURE: 'true' });
    try {
      const wrongPassword = await login(php.baseUrl, ownerEmail, `${ownerPassword}-wrong`);
      const unknownEmail = await login(php.baseUrl, `missing-${ownerEmail}`, ownerPassword);
      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      const wrongBody = await wrongPassword.json();
      expect(wrongBody).toEqual({ message: 'Email or password is incorrect.' });
      expect(await unknownEmail.json()).toEqual(wrongBody);

      const signIn = await login(php.baseUrl, ownerEmail.toUpperCase(), ownerPassword);
      expect(signIn.status).toBe(200);
      const body = await signIn.json();
      expect(body).toEqual({ authenticated: true });
      expect(JSON.stringify(body)).not.toContain(ownerPassword);
      const setCookie = String(signIn.headers.get('set-cookie'));
      expect(setCookie).toMatch(/HttpOnly/i);
      expect(setCookie).toMatch(/SameSite=Lax/i);
      expect(setCookie).toMatch(/secure/i);
      expect(setCookie).toMatch(/Max-Age=28800/);
      const cookie = sessionCookie(signIn);
      const token = cookie.split('=')[1];

      const [owners] = await connection.execute<mysql.RowDataPacket[]>("SELECT email, password_hash, role FROM users WHERE role IN ('owner','admin')");
      expect(owners).toHaveLength(1);
      expect(owners[0]).toMatchObject({ email: ownerEmail, role: 'owner' });
      expect(String(owners[0].password_hash)).toMatch(/^\$2y\$/);
      expect(String(owners[0].password_hash)).not.toContain(ownerPassword);

      const [sessions] = await connection.execute<mysql.RowDataPacket[]>('SELECT token_hash FROM staff_sessions s JOIN users u ON u.id = s.user_id WHERE u.email = ?', [ownerEmail]);
      expect(sessions).toEqual([{ token_hash: crypto.createHash('sha256').update(token).digest('hex') }]);

      const session = await fetch(`${php.baseUrl}/api/admin/session`, { headers: { Cookie: cookie } });
      expect(session.status).toBe(200);
      expect(await session.json()).toEqual({ authenticated: true, user: { name: 'QA Owner', email: ownerEmail, role: 'owner' } });

      const [audit] = await connection.execute<mysql.RowDataPacket[]>("SELECT action, CAST(metadata AS CHAR) AS metadata FROM activity_audit_records WHERE entity_type = 'authentication' AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.email_hash')) = ?", [crypto.createHash('sha256').update(ownerEmail).digest('hex')]);
      const actions = audit.map(row => row.action);
      expect(actions).toEqual(expect.arrayContaining(['administrator_bootstrapped', 'login_failed', 'login_succeeded']));
      expect(audit.every(row => !String(row.metadata).includes(ownerPassword))).toBe(true);
    } finally { await php.close(); }
  });

  it('does not recreate or overwrite the administrator when bootstrap settings change', async () => {
    const php = await startPhp({ ...settings, BOOTSTRAP_ADMIN_EMAIL: `other-${ownerEmail}`, BOOTSTRAP_ADMIN_PASSWORD: 'a-different-bootstrap-pass' });
    try {
      expect((await login(php.baseUrl, `other-${ownerEmail}`, 'a-different-bootstrap-pass')).status).toBe(401);
      expect((await login(php.baseUrl, ownerEmail, ownerPassword)).status).toBe(200);
      const [owners] = await connection.execute<mysql.RowDataPacket[]>("SELECT email FROM users WHERE role IN ('owner','admin')");
      expect(owners).toEqual([{ email: ownerEmail }]);
    } finally { await php.close(); }
  });

  it('protects every staff API, rotates sessions and destroys them on logout', async () => {
    const php = await startPhp({ ...settings, ...noBootstrap });
    try {
      for (const route of adminReadRoutes) {
        expect((await fetch(`${php.baseUrl}/api/admin/${route}`)).status).toBe(401);
        expect((await fetch(`${php.baseUrl}/api/admin/${route}`, { headers: { Cookie: `omni_staff_session=${'a'.repeat(64)}` } })).status).toBe(401);
      }
      const first = sessionCookie(await login(php.baseUrl, ownerEmail, ownerPassword));
      const second = sessionCookie(await login(php.baseUrl, ownerEmail, ownerPassword));
      expect(second).not.toBe(first);
      expect((await fetch(`${php.baseUrl}/api/admin/session`, { headers: { Cookie: first } })).status).toBe(401);
      for (const route of adminReadRoutes) expect((await fetch(`${php.baseUrl}/api/admin/${route}`, { headers: { Cookie: second } })).status).toBe(200);

      const logout = await fetch(`${php.baseUrl}/api/admin/logout`, { method: 'POST', headers: { Cookie: second } });
      expect(logout.status).toBe(204);
      expect(String(logout.headers.get('set-cookie'))).toMatch(/omni_staff_session=(deleted)?;/);
      expect((await fetch(`${php.baseUrl}/api/admin/session`, { headers: { Cookie: second } })).status).toBe(401);
      const [remaining] = await connection.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) AS count FROM staff_sessions s JOIN users u ON u.id = s.user_id WHERE u.email = ?', [ownerEmail]);
      expect(Number(remaining[0].count)).toBe(0);
      expect((await fetch(`${php.baseUrl}/api/admin/logout`, { method: 'POST', headers: { Cookie: second } })).status).toBe(204);
    } finally { await php.close(); }
  });

  it('stores public contact and quote submissions and shows them in the CRM', async () => {
    const php = await startPhp({ ...settings, ...noBootstrap });
    try {
      const submittedAt = Date.now();
      const contact = await fetch(`${php.baseUrl}/api/contact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': clientAddress() },
        body: JSON.stringify({ name: 'QA Contact', email: contactEmail, phone: '07000000000', message: 'Contact-to-CRM persistence verification.', preferredContact: 'Email', source: 'php-api-test', website: '', consent: true }),
      });
      expect(contact.status).toBe(201);
      const contactReference = (await contact.json() as { reference: string }).reference;

      const form = new FormData();
      Object.entries({
        projectType: 'Home Extension', propertyType: 'Semi-detached', postcode: 'M20 1AA',
        description: 'Quote-to-CRM persistence verification.', stage: 'Exploring options', budget: '', start: 'ASAP',
        contactName: 'QA Quote', email: quoteEmail, phone: '07000000000', preferredContact: 'Email', consent: 'true',
      }).forEach(([key, value]) => form.append(key, value));
      form.append('files', new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9])], { type: 'image/jpeg' }), 'qa.jpg');
      const quote = await fetch(`${php.baseUrl}/api/quote`, { method: 'POST', body: form, headers: { 'X-Forwarded-For': clientAddress() } });
      expect(quote.status).toBe(201);
      const quoteReference = (await quote.json() as { reference: string }).reference;

      const cookie = sessionCookie(await login(php.baseUrl, ownerEmail, ownerPassword));
      const leads = await (await fetch(`${php.baseUrl}/api/admin/leads`, { headers: { Cookie: cookie } })).json() as { records: Array<{ reference: string; createdAt: string }> };
      const lead = leads.records.find(record => record.reference === contactReference);
      expect(lead).toBeDefined();
      // Timestamps are UTC ISO-8601 regardless of the database host's time zone.
      expect(Math.abs(Date.parse(String(lead?.createdAt)) - submittedAt)).toBeLessThan(5 * 60 * 1000);

      const quotes = await (await fetch(`${php.baseUrl}/api/admin/quotes`, { headers: { Cookie: cookie } })).json() as { records: Array<{ reference: string; fileCount: number }> };
      expect(quotes.records.find(record => record.reference === quoteReference)).toMatchObject({ fileCount: 1 });

      const summary = await (await fetch(`${php.baseUrl}/api/admin/summary`, { headers: { Cookie: cookie } })).json() as Record<string, number>;
      expect(summary.contacts).toBeGreaterThanOrEqual(1);
      expect(summary.quotes).toBeGreaterThanOrEqual(1);
      expect(await fs.readdir(path.join(uploadRoot, 'private'))).toHaveLength(1);
    } finally { await php.close(); }
  });

  it('rate limits sign-in attempts per client address behind the trusted proxy', async () => {
    const php = await startPhp({ ...settings, ...noBootstrap });
    try {
      const limited = clientAddress();
      for (let attempt = 0; attempt < 10; attempt += 1) expect((await login(php.baseUrl, ownerEmail, 'wrong-password-value', limited)).status).toBe(401);
      const blocked = await login(php.baseUrl, ownerEmail, ownerPassword, limited);
      expect(blocked.status).toBe(429);
      expect(await blocked.json()).toEqual({ message: 'Too many sign-in attempts. Please wait and try again.' });
      expect((await login(php.baseUrl, ownerEmail, ownerPassword)).status).toBe(200);
    } finally { await php.close(); }
  });
});
