// Recursive photograph inventory scanner.
// Emits docs/_photo_metadata.json with dimensions, orientation and EXIF for every
// discovered image so the manifest and before/after evidence can be built from
// real technical data rather than guesswork.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.tif', '.tiff']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'dist-server', 'deployment', 'visual-qa', 'qa', 'visual-reference']);

/** Source folders that may contain supplied photography. */
const SCAN_ROOTS = [
  'Photos',
  'public',
  'uploads',
  'Generates Map Image',
  'design-reference',
  'Omni Development',
];

function collect(dir, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collect(full, out);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (EXTENSIONS.has(ext)) out.push(full);
    }
  }
}

(async () => {
  const files = [];
  for (const rel of SCAN_ROOTS) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs)) collect(abs, files);
  }

  const records = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const stat = fs.statSync(file);
    const record = {
      path: rel,
      filename: path.basename(file),
      format: path.extname(file).slice(1).toLowerCase(),
      bytes: stat.size,
      mtime: stat.mtimeMs,
      width: null,
      height: null,
      orientation: null,
      space: null,
      density: null,
      hasAlpha: null,
      error: null,
    };
    try {
      const meta = await sharp(file).metadata();
      record.width = meta.width ?? null;
      record.height = meta.height ?? null;
      record.orientation = meta.orientation ?? null;
      record.space = meta.space ?? null;
      record.density = meta.density ?? null;
      record.hasAlpha = meta.hasAlpha ?? null;
    } catch (error) {
      record.error = String(error.message || error);
    }
    records.push(record);
  }

  records.sort((a, b) => a.path.localeCompare(b.path));
  fs.writeFileSync(
    path.join(ROOT, 'docs', '_photo_metadata.json'),
    JSON.stringify(records, null, 2)
  );
  console.log(`scanned ${records.length} images`);
})();
