// Builds production-safe image assets from the supplied photograph library.
//
// Guarantees:
//   * originals in `Photos/` are never read-destructively touched, moved or renamed
//   * every published asset gets a modern WebP plus -960 / -640 responsive variants
//     and a JPEG fallback for older clients
//   * filenames are lowercase, ASCII, and free of spaces, brackets and dots
//   * nothing is distorted: aspect ratio is preserved and no crop is applied
//   * real measured dimensions are emitted to client/src/data/photoAssets.ts so
//     every <img> can carry explicit width/height and avoid layout shift
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const PHOTOS = path.join(ROOT, 'Photos');
const OUT = path.join(ROOT, 'public', 'images');
const WEBP_QUALITY = 78;
/** Effort 6 costs a little encode time but buys ~3% smaller files at equal quality. */
const WEBP_EFFORT = 6;
const JPEG_QUALITY = 80;
const WIDTHS = [640, 960, 1600];

/**
 * Stable, traceable slug per source photograph.
 *
 * Built from the WhatsApp capture timestamp plus the position within that
 * timestamp group, e.g. `WhatsApp Image 2026-07-25 at 12.00.28 PM (1).jpeg`
 * becomes `omni-a120028-01`. The batch letter (`a` = 2026-07-25, `b` =
 * 2026-10-16) keeps the two shoots apart, so every slug is unique and — unlike a
 * running index — stays stable when new photographs are added later.
 *
 * Output is lowercase ASCII with no spaces, brackets or extra dots.
 */
function slugFor(filename) {
  const batch = /2026-10-16/.test(filename) ? 'b' : 'a';
  const suffix = /\((\d+)\)\.jpeg$/i.exec(filename);
  const order = suffix ? Number(suffix[1]) : 0;
  const time = /at\s+(\d+)\.(\d+)\.(\d+)\s*(AM|PM)/i.exec(filename);
  if (!time) {
    // One supplied file ("WhatsApp Image 2026-10-16 at.jpeg") has no capture time.
    // It still needs a stable, unique slug rather than a guessed timestamp.
    return `omni-${batch}-untimed-${String(order).padStart(2, '0')}`;
  }
  let hours = Number(time[1]) % 12;
  if (/^PM$/i.test(time[4])) hours += 12;
  const hms = `${String(hours).padStart(2, '0')}${time[2]}${time[3]}`;
  return `omni-${batch}${hms}-${String(order).padStart(2, '0')}`;
}

/** Sources that already have hand-named production assets — left untouched. */
const ALREADY_PUBLISHED = new Set([
  'WhatsApp Image 2026-07-25 at 11.59.05 AM.jpeg',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (1).jpeg',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (2).jpeg',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (4).jpeg',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (6).jpeg',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (8).jpeg',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (9).jpeg',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (10).jpeg',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (15).jpeg',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (17).jpeg',
  'WhatsApp Image 2026-07-25 at 12.00.26 PM.jpeg',
  'WhatsApp Image 2026-07-25 at 12.00.27 PM.jpeg',
  'WhatsApp Image 2026-07-25 at 12.00.28 PM (18).jpeg',
  'WhatsApp Image 2026-07-25 at 12.00.28 PM (20).jpeg',
]);

/** Descriptive names already in production, so existing references keep working. */
const PUBLISHED_SLUGS = {
  'WhatsApp Image 2026-07-25 at 11.59.05 AM.jpeg': 'project-bathroom-01',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (1).jpeg': 'garden-landscaping',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (2).jpeg': 'interior-stair',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (4).jpeg': 'site-interior',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (6).jpeg': 'about-omni-van',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (8).jpeg': 'home-front',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (9).jpeg': 'driveway-finish',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (10).jpeg': 'completed-facade',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (15).jpeg': 'home-extension-hero',
  'WhatsApp Image 2026-07-25 at 11.59.05 AM (17).jpeg': 'garden-beds',
  'WhatsApp Image 2026-07-25 at 12.00.26 PM.jpeg': 'works-site',
  'WhatsApp Image 2026-07-25 at 12.00.27 PM.jpeg': 'timber-frame',
  'WhatsApp Image 2026-07-25 at 12.00.28 PM (18).jpeg': 'insulation-detail',
  'WhatsApp Image 2026-07-25 at 12.00.28 PM (20).jpeg': 'insulation-room',
};

module.exports = { ROOT, PHOTOS, OUT, WEBP_QUALITY, WEBP_EFFORT, JPEG_QUALITY, WIDTHS, slugFor, ALREADY_PUBLISHED, PUBLISHED_SLUGS, sharp, fs, path };
