import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import type { Connection } from 'mysql2/promise';

export type DbConfig = { host: string; port: number; database: string; user: string; password: string };

/**
 * Reads the disposable test database settings and refuses anything that could be a live database.
 * Missing settings fail the run loudly; MySQL verification is never silently skipped.
 */
export function requiredTestDatabase(): DbConfig {
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

export async function applyAuthoritativeMigrations(connection: Connection) {
  const migrationDir = path.resolve('database', 'migrations');
  const files = (await fs.readdir(migrationDir)).filter(file => /^\d+.*\.sql$/i.test(file)).sort();
  for (const file of files) await connection.query(await fs.readFile(path.join(migrationDir, file), 'utf8'));
}

export async function availablePort() {
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
