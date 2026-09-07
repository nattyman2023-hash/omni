/**
 * Extracts the shared <header> and <footer> markup from the canonical
 * Stitch home page and writes pretty-printed copies to visual-reference/
 * so OmniHeader / OmniFooter can be translated verbatim. Read-only on
 * the originals.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const home = path.join(root, 'Omni Development', 'stitch_omni_developments_digital_platform', 'stitch_omni_developments_digital_platform', 'omni_developments_manchester_home', 'code.html');

function pretty(html) {
  // Lightweight indenter: insert newlines before tags, then indent by depth.
  let out = html.replace(/>\s*</g, '>\n<');
  let depth = 0;
  const voidish = /^(meta|link|img|input|br|hr)\b/i;
  return out
    .split('\n')
    .map((line) => {
      line = line.trim();
      if (!line) return '';
      const closing = line.startsWith('</');
      if (closing) depth = Math.max(0, depth - 1);
      const ind = '  '.repeat(depth);
      const opens = /^<[^/!?]/.test(line) && !voidish.test(line) && !/<\/[^>]+>$/.test(line);
      if (opens) depth += 1;
      return ind + line;
    })
    .join('\n');
}

(async () => {
  const raw = await fs.readFile(home, 'utf8');
  const dom = new JSDOM(raw, { runScripts: 'outside-only' });
  const d = dom.window.document;
  const header = d.querySelector('header');
  const footers = [...d.querySelectorAll('footer')];
  // The page footer is the last <footer> and a direct child of <body>;
  // earlier <footer> elements are testimonial/blockquote author lines.
  const footer = footers.length ? footers[footers.length - 1] : null;
  const out = path.join(root, 'visual-reference');
  await fs.writeFile(path.join(out, 'shared-header.html'), header ? pretty(header.outerHTML) : '(no header)');
  await fs.writeFile(path.join(out, 'shared-footer.html'), footer ? pretty(footer.outerHTML) : '(no footer)');
  process.stdout.write(`header bytes: ${header ? header.outerHTML.length : 0}\nfooter bytes: ${footer ? footer.outerHTML.length : 0}\n`);
})().catch((e) => { process.stderr.write(`${e.stack || e}\n`); process.exitCode = 1; });
