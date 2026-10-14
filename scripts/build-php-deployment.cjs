const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const php = path.join(root, 'php');
const output = path.join(root, 'deployment', 'php-public-html');

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  throw new Error('Frontend build is missing. Run npm run build first.');
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.cpSync(dist, output, { recursive: true });
fs.cpSync(php, output, { recursive: true });

// A real credential file must never be copied into a deployment package.
fs.rmSync(path.join(output, 'api', 'config.local.php'), { force: true });

console.log(`PHP deployment package created at ${path.relative(root, output)}`);
