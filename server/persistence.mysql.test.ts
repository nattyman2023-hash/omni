import { spawn, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import mysql, { type Connection } from 'mysql2/promise';
import { describe, expect, it } from 'vitest';

type DbConfig = { host: string; port: number; database: string; user: string; password: string };

function requiredTestDatabase(): DbConfig {
  const required = ['TEST_DATABASE_HOST', 'TEST_DATABASE_PORT', 'TEST_DATABASE_NAME', 'TEST_DATABASE_USER', 'TEST_DATABASE_PASSWORD'] as const;
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) {
    throw new Error(`MySQL persistence verification requires ${missing.join(', ')}. No test was skipped.`);
  }

  const config = {
    host: String(process.env.TEST_DATABASE_HOST),
    port: Number(process.env.TEST_DATABASE_PORT),
    database: String(process.env.TEST_DATABASE_NAME),
    user: String(process.env.TEST_DATABASE_USER),
    password: String(process.env.TEST_DATABASE_PASSWORD),
  };

  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error('TEST_DATABASE_PORT must be an integer from 1 to 65535.');
  }

  if (!/(test|qa|sandbox)/i.test(config.database) || /(prod|production|live)/i.test(config.database)) {
    throw new Error('TEST_DATABASE_NAME must clearly identify a disposable test/QA/sandbox database and must not contain prod, production or live.');
  }

  const productionName = String(process.env.DATABASE_NAME || '').trim();
  if (productionName && config.database.toLowerCase() === productionName.toLowerCase()) {
    throw new Error('Safety stop: TEST_DATABASE_NAME matches DATABASE_NAME.');
  }

  const productionConfigured = ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD'].every(key => Boolean(process.env[key]));
  if (productionConfigured) {
    const sameConfiguration = config.host.toLowerCase() === String(process.env.DATABASE_HOST).toLowerCase()
      && config.port === Number(process.env.DATABASE_PORT || 3306)
      && config.database.toLowerCase() === String(process.env.DATABASE_NAME).toLowerCase()
      && config.user.toLowerCase() === String(process.env.DATABASE_USER).toLowerCase()
      && config.password === String(process.env.DATABASE_PASSWORD);
    if (sameConfiguration) throw new Error('Safety stop: test and production database configurations are identical.');
  }

  return config;
}

async function applyAuthoritativeMigrations(connection: Connection) {
  const migrationDir = path.resolve('database', 'migrations');
  const files = (await fs.readdir(migrationDir)).filter(file => /^\d+.*\.sql$/i.test(file)).sort();
  for (const file of files) await connection.query(await fs.readFile(path.join(migrationDir, file), 'utf8'));
}

async function availablePort() {
  return await new Promise<number>((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') return reject(new Error('Could not reserve a local test port.'));
      probe.close(error => error ? reject(error) : resolve(address.port));
    });
  });
}

async function startApplication(config: DbConfig, port: number, uploadRoot: string) {
  const entry = path.resolve('dist-server', 'server.js');
  await fs.access(entry).catch(() => { throw new Error('dist-server/server.js is missing. Run npm run build before npm run test:mysql.'); });
  const child = spawn(process.execPath, [entry], {
    cwd: path.resolve('.'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      APP_URL: `http://127.0.0.1:${port}`,
      TRUST_PROXY: '',
      COOKIE_SECURE: 'false',
      STAGING_MODE: 'false',
      OUTBOUND_MESSAGES_ENABLED: 'false',
      DATABASE_HOST: config.host,
      DATABASE_PORT: String(config.port),
      DATABASE_NAME: config.database,
      DATABASE_USER: config.user,
      DATABASE_PASSWORD: config.password,
      UPLOAD_DIR: path.join(uploadRoot, 'private'),
      PROJECT_UPLOAD_DIR: path.join(uploadRoot, 'projects'),
      BOOTSTRAP_ADMIN_EMAIL: '',
      BOOTSTRAP_ADMIN_PASSWORD: '',
      BOOTSTRAP_ADMIN_NAME: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', chunk => { output += String(chunk); });
  child.stderr.on('data', chunk => { output += String(chunk); });

  const baseUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Application exited before readiness. ${output.trim()}`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.status === 200) return { child, baseUrl };
    } catch {
      // The listener may not be ready yet.
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  child.kill('SIGTERM');
  throw new Error(`Application did not become ready. ${output.trim()}`);
}

async function stopApplication(child: ChildProcess) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Application did not stop after SIGTERM.')), 10_000);
    child.once('exit', () => { clearTimeout(timeout); resolve(); });
  });
}

describe('MySQL persistence across an application restart', () => {
  it('persists contacts, quotes, quote files and project edits', async () => {
    const config = requiredTestDatabase();
    const connection = await mysql.createConnection({ ...config, multipleStatements: true });
    const runId = crypto.randomUUID().split('-').join('');
    const contactEmail = `phase1-contact-${runId}@example.invalid`;
    const quoteEmail = `phase1-quote-${runId}@example.invalid`;
    const adminEmail = `phase1-admin-${runId}@example.invalid`;
    const projectSlug = `phase1-persistence-${runId}`;
    const adminPassword = crypto.randomBytes(24).toString('base64url');
    const uploadRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'omni-phase1-mysql-'));
    const port = await availablePort();
    let child: ChildProcess | null = null;
    let contactReference = '';
    let quoteReference = '';
    let projectId: number | null = null;

    try {
      await applyAuthoritativeMigrations(connection);
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const [adminResult] = await connection.execute<mysql.ResultSetHeader>(
        "INSERT INTO users (email, password_hash, display_name, role, is_active) VALUES (?, ?, 'Phase 1 QA', 'admin', TRUE)",
        [adminEmail, passwordHash],
      );

      const firstRun = await startApplication(config, port, uploadRoot);
      child = firstRun.child;
      const baseUrl = firstRun.baseUrl;

      const contactResponse = await fetch(`${baseUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Phase 1 QA', email: contactEmail, phone: '07000000000',
          message: 'Disposable MySQL persistence verification record.', preferredContact: 'Email',
          source: 'phase-1-mysql-test', website: '', consent: true,
        }),
      });
      expect(contactResponse.status).toBe(201);
      contactReference = String((await contactResponse.json() as { reference: string }).reference);

      const quoteForm = new FormData();
      Object.entries({
        projectType: 'Home Extension', propertyType: 'Semi-detached', postcode: 'M20 1AA',
        description: 'Disposable MySQL quote and file persistence verification record.',
        stage: 'Exploring options', budget: '', start: 'ASAP', contactName: 'Phase 1 QA',
        email: quoteEmail, phone: '07000000000', preferredContact: 'Email', consent: 'true',
      }).forEach(([key, value]) => quoteForm.append(key, value));
      quoteForm.append('files', new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }), 'phase1-test.jpg');
      const quoteResponse = await fetch(`${baseUrl}/api/quote`, { method: 'POST', body: quoteForm });
      expect(quoteResponse.status).toBe(201);
      quoteReference = String((await quoteResponse.json() as { reference: string }).reference);

      const loginResponse = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      expect(loginResponse.status).toBe(200);
      const cookie = String(loginResponse.headers.get('set-cookie') || '').split(';', 1)[0];
      expect(cookie).toContain('omni_staff_session=');

      const projectPayload = {
        slug: projectSlug,
        title: 'Phase 1 persistence QA record',
        location: 'Disposable QA database',
        category: 'QA',
        description: 'A disposable project record used only to verify MySQL persistence.',
        image: '/images/site-interior.webp',
        gallery: ['/images/site-interior.webp'],
        tags: ['QA'],
        published: false,
      };
      const createProject = await fetch(`${baseUrl}/api/admin/projects`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(projectPayload),
      });
      expect(createProject.status).toBe(201);
      projectId = Number((await createProject.json() as { project: { id: number } }).project.id);
      const updateProject = await fetch(`${baseUrl}/api/admin/projects/${projectId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ ...projectPayload, title: 'Phase 1 persistence QA record updated', published: true }),
      });
      expect(updateProject.status).toBe(200);

      await stopApplication(firstRun.child);
      child = null;
      const secondRun = await startApplication(config, port, uploadRoot);
      child = secondRun.child;

      const projectAfterRestart = await fetch(`${secondRun.baseUrl}/api/projects/${projectSlug}`);
      expect(projectAfterRestart.status).toBe(200);
      expect((await projectAfterRestart.json() as { title: string }).title).toBe('Phase 1 persistence QA record updated');

      const [contacts] = await connection.execute<mysql.RowDataPacket[]>('SELECT id FROM contact_enquiries WHERE public_reference = ? AND email = ?', [contactReference, contactEmail]);
      const [quotes] = await connection.execute<mysql.RowDataPacket[]>('SELECT id FROM quote_requests WHERE public_reference = ? AND email = ?', [quoteReference, quoteEmail]);
      const [quoteFiles] = await connection.execute<mysql.RowDataPacket[]>('SELECT id FROM quote_request_files WHERE quote_request_id = ?', [quotes[0]?.id]);
      const [projects] = await connection.execute<mysql.RowDataPacket[]>('SELECT id, title, publication_status FROM projects WHERE id = ? AND slug = ?', [projectId, projectSlug]);
      expect(contacts).toHaveLength(1);
      expect(quotes).toHaveLength(1);
      expect(quoteFiles).toHaveLength(1);
      expect(projects).toMatchObject([{ id: projectId, title: 'Phase 1 persistence QA record updated', publication_status: 'published' }]);

      await connection.execute('DELETE FROM users WHERE id = ?', [adminResult.insertId]);
    } finally {
      if (child) await stopApplication(child).catch(() => undefined);
      if (projectId) await connection.execute('DELETE FROM projects WHERE id = ?', [projectId]).catch(() => undefined);
      if (contactReference) await connection.execute('DELETE FROM contact_enquiries WHERE public_reference = ?', [contactReference]).catch(() => undefined);
      if (quoteReference) await connection.execute('DELETE FROM quote_requests WHERE public_reference = ?', [quoteReference]).catch(() => undefined);
      await connection.execute('DELETE FROM users WHERE email = ?', [adminEmail]).catch(() => undefined);
      await connection.end();
      await fs.rm(uploadRoot, { recursive: true, force: true });
    }
  });
});
