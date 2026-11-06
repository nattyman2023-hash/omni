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

if (crmProfile) {
  // Ship an inert template next to the package so the live config can be created by copy-and-fill.
  fs.copyFileSync(path.join(php, 'api', 'config.example.php'), path.join(output, 'api', 'config.local.php.TEMPLATE.php'));
}

console.log(`PHP deployment package created at ${path.relative(root, output)}${crmProfile ? ' (CRM profile, login-first)' : ''}`);

