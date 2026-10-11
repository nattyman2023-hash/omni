const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const migrationDir = path.join(projectRoot, 'database', 'migrations');
const outputPath = path.join(projectRoot, 'deploy', 'schema.sql');
const checkOnly = process.argv.includes('--check');
const normalizeLineEndings = value => value.replace(/\r\n?/g, '\n');

function renderSchema() {
  const files = fs.readdirSync(migrationDir)
    .filter(file => /^\d+.*\.sql$/i.test(file))
    .sort((left, right) => left.localeCompare(right, 'en'));

  if (!files.length) throw new Error('No ordered SQL migrations were found.');

  const header = [
    '-- GENERATED FILE: do not edit directly.',
    '-- Source of truth: database/migrations/*.sql in filename order.',
    '-- Regenerate with: npm run db:schema:generate',
    '-- Verify with: npm run db:schema:check',
    '',
    'SET NAMES utf8mb4;',
    '',
  ].join('\n');

  const body = files.map(file => {
    const sql = normalizeLineEndings(fs.readFileSync(path.join(migrationDir, file), 'utf8')).trim();
    return `-- BEGIN MIGRATION: ${file}\n${sql}\n-- END MIGRATION: ${file}`;
  }).join('\n\n');

  return `${header}${body}\n`;
}

const expected = renderSchema();

if (checkOnly) {
  const current = fs.existsSync(outputPath)
    ? normalizeLineEndings(fs.readFileSync(outputPath, 'utf8'))
    : '';
  if (current !== expected) {
    process.stderr.write('deploy/schema.sql is out of sync with database/migrations. Run npm run db:schema:generate.\n');
    process.exit(1);
  }
  process.stdout.write('deploy/schema.sql matches the ordered migrations.\n');
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, expected, 'utf8');
  process.stdout.write(`Generated ${path.relative(projectRoot, outputPath)} from ordered migrations.\n`);
}
