const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const php = path.join(root, 'php');
// --crm builds the login-first profile for crm.omnidevelopment.co.uk into its own folder
// so the marketing package and the CRM package can never overwrite each other.
const crmProfile = process.argv.includes('--crm');
const output = path.join(root, 'deployment', crmProfile ? 'crm-public-html' : 'php-public-html');

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  throw new Error('Frontend build is missing. Run npm run build first.');
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.cpSync(dist, output, { recursive: true });
fs.cpSync(php, output, { recursive: true });

// A real credential file must never be copied into a deployment package.
fs.rmSync(path.join(output, 'api', 'config.local.php'), { force: true });
// CLI tooling stays out of the web root; it is only for local or SSH access.
fs.rmSync(path.join(output, 'tools'), { recursive: true, force: true });

// Shared hosting has no migration runner, so the PHP API applies pending 005+ migrations itself
// (crm_sales.php: crmEnsureMigrations). database/ is not shipped, so copy those files into the
// web-denied api/private directory (php/api/private/.htaccess: Require all denied).
const migrationSource = path.join(root, 'database', 'migrations');
const migrationTarget = path.join(output, 'api', 'private', 'migrations');
fs.rmSync(migrationTarget, { recursive: true, force: true });
fs.mkdirSync(migrationTarget, { recursive: true });
const shippedMigrations = fs.readdirSync(migrationSource)
  .filter((file) => /^\d+_[A-Za-z0-9_]+\.sql$/.test(file) && Number.parseInt(file, 10) >= 5);
if (shippedMigrations.length === 0) throw new Error('No 005+ migrations found to ship with the PHP package.');
for (const file of shippedMigrations) fs.copyFileSync(path.join(migrationSource, file), path.join(migrationTarget, file));
if (!fs.existsSync(path.join(output, 'api', 'private', '.htaccess'))) {
  throw new Error('api/private/.htaccess is missing; the shipped migrations would be web-readable.');
}

if (crmProfile) {
  // Ship an inert template next to the package so the live config can be created by copy-and-fill.
  // It is derived from config.example.php (so new keys always flow through) with the CRM subdomain
  // defaults applied; only the database credentials still need typing in.
  const example = fs.readFileSync(path.join(php, 'api', 'config.example.php'), 'utf8');
  const template = example
    .replace("'APP_URL' => 'https://example.com'", "'APP_URL' => 'https://crm.omnidevelopment.co.uk'")
    .replace("'STAGING_MODE' => 'false'", "'STAGING_MODE' => 'true'")
    .replace("'DEMO_MODE' => 'false'", "'DEMO_MODE' => 'true'")
    .replace("'BOOTSTRAP_ADMIN_EMAIL' => ''", "'BOOTSTRAP_ADMIN_EMAIL' => 'admin@omnidevelopment.co.uk'")
    .replace("'BOOTSTRAP_ADMIN_PASSWORD' => ''", "'BOOTSTRAP_ADMIN_PASSWORD' => 'OmniDemo2026!'");
  const expected = [
    "'APP_URL' => 'https://crm.omnidevelopment.co.uk'",
    "'STAGING_MODE' => 'true'",
    "'DEMO_MODE' => 'true'",
    "'BOOTSTRAP_ADMIN_PASSWORD' => 'OmniDemo2026!'",
  ];
  const missing = expected.filter((line) => !template.includes(line));
  if (missing.length > 0) {
    throw new Error(`config.example.php no longer contains ${missing.join(', ')}; update the CRM template replacements.`);
  }
  fs.writeFileSync(path.join(output, 'api', 'config.local.php.TEMPLATE.php'), template);
}

console.log(`PHP deployment package created at ${path.relative(root, output)}${crmProfile ? ' (CRM profile, login-first)' : ''}`);

