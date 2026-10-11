const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const required = ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD'];
if (!required.every(key => process.env[key])) {
  console.error('Database environment variables are missing. Configure MySQL before running migrations.');
  process.exit(1);
}

const migrationLock = 'omni_developments_schema_migrations';

function safeErrorCode(error) {
  const code = error && typeof error === 'object' ? String(error.code || '') : '';
  return /^[A-Z0-9_]+$/.test(code) ? code : 'unknown';
}

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 3306),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    multipleStatements: true,
  });

  let lockAcquired = false;
  try {
    const [lockRows] = await connection.execute('SELECT GET_LOCK(?, 30) AS acquired', [migrationLock]);
    lockAcquired = Number(lockRows[0]?.acquired) === 1;
    if (!lockAcquired) throw new Error('Could not acquire the database migration lock.');

    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(32) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    const migrationDir = path.join(__dirname, '..', 'database', 'migrations');
    const files = fs.readdirSync(migrationDir).filter(file => /^\d+.*\.sql$/i.test(file)).sort();
    if (!files.length) throw new Error('No ordered database migrations were found.');

    for (const file of files) {
      const version = path.basename(file, '.sql');
      const [rows] = await connection.execute('SELECT version FROM schema_migrations WHERE version = ? LIMIT 1', [version]);
      if (rows.length) {
        process.stdout.write(`Skipped ${file} (already applied)\n`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await connection.query(sql);
      const [appliedRows] = await connection.execute('SELECT version FROM schema_migrations WHERE version = ? LIMIT 1', [version]);
      if (!appliedRows.length) throw new Error(`${file} completed without recording schema_migrations version ${version}.`);
      process.stdout.write(`Applied ${file}\n`);
    }
  } finally {
    if (lockAcquired) await connection.execute('SELECT RELEASE_LOCK(?)', [migrationLock]).catch(() => undefined);
    await connection.end();
  }
})().catch(error => {
  console.error(`Database migration failed (code=${safeErrorCode(error)}). Connection details were not logged.`);
  process.exit(1);
});
