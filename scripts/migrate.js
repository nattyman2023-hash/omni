const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const required = ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD'];
if (!required.every(key => process.env[key])) {
  console.error('Database environment variables are missing. Copy .env.example to .env and configure MySQL before running migrations.');
  process.exit(1);
}

(async () => {
  const connection = await mysql.createConnection({ host: process.env.DATABASE_HOST, port: Number(process.env.DATABASE_PORT || 3306), database: process.env.DATABASE_NAME, user: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD, multipleStatements: true });
  const migrationDir = path.join(__dirname, '..', 'database', 'migrations');
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(32) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const files = fs.readdirSync(migrationDir).filter(file => file.endsWith('.sql')).sort();
  for (const file of files) {
    const version = path.basename(file, '.sql');
    const [rows] = await connection.execute('SELECT version FROM schema_migrations WHERE version = ? LIMIT 1', [version]);
    if (rows.length) {
      process.stdout.write(`Skipped ${file} (already applied)\n`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
    await connection.beginTransaction();
    try {
      await connection.query(sql);
      await connection.commit();
      process.stdout.write(`Applied ${file}\n`);
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
  await connection.end();
})().catch(error => { console.error(error.message); process.exit(1); });
