/**
 * Structural analyser for the canonical Stitch HTML (read-only).
 * Extracts section order, backgrounds, padding, headings, grid column
 * counts and card counts per page, plus the shared footer. Writes
 * visual-reference/structure.json and echoes a compact summary.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const stitchRoot = path.join(root, 'Omni Development', 'stitch_omni_developments_digital_platform', 'stitch_omni_developments_digital_platform');

const PAGES = [
  { dir: 'omni_developments_manchester_home', name: 'home' },
  { dir: 'omni_developments_manchester_home_extensions', name: 'extensions' },
  { dir: 'omni_developments_manchester_about_us', name: 'about' },
  { dir: 'omni_developments_manchester_areas_we_cover', name: 'areas' },
  { dir: 'omni_developments_manchester_bathroom_installation', name: 'bathroom' },
  { dir: 'omni_developments_manchester_client_reviews', name: 'reviews' },
  { dir: 'omni_developments_manchester_contact_us', name: 'contact' },
  { dir: 'omni_developments_manchester_guides_advice', name: 'guides' },
  { dir: 'omni_developments_manchester_guide_article', name: 'guide-article' },
];

const cls = (el) => (el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
const bg = (cs) => cs.find((c) => c.startsWith('bg-')) || '';
const pad = (cs) => cs.filter((c) => /^p[tyb]?-space-/.test(c)).join(' ');
const cols = (cs) => {
  const o = {};
  for (const c of cs) {
    const m = c.match(/^((?:sm|md|lg|xl):)?grid-cols-(\d+)$/);
    if (m) o[m[1] ? m[1].replace(':', '') : 'base'] = +m[2];
  }
  return o;
};
const head = (s) => {
  for (const t of ['h1', 'h2', 'h3', 'h4']) {
    const e = s.querySelector(t);
    if (e) return { tag: t, text: (e.textContent || '').trim().slice(0, 140) };
  }
  return null;
};
const grids = (s) => {
  const out = [];
  s.querySelectorAll('[class*="grid-cols"]').forEach((g) => {
    const cs = cls(g);
    const c = cols(cs);
    if (Object.keys(c).length) out.push({ cols: c, children: g.children.length, cards: [...g.children].filter((ch) => cls(ch).some((x) => x.startsWith('bg-') || x.includes('shadow'))).length });
  });
  return out;
};
const label = (s, raw) => {
  const idx = raw.indexOf(s.outerHTML);
  if (idx < 0) return null;
  const b = raw.slice(0, idx);
  const lc = b.lastIndexOf('<!--');
  if (lc < 0) return null;
  const end = b.indexOf('-->', lc);
  if (end < 0 || end > idx) return null;
  return b.slice(lc + 4, end).replace(/[-=]/g, '').trim();
};

async function analyze(p) {
  const raw = await fs.readFile(path.join(stitchRoot, p.dir, 'code.html'), 'utf8');
  const dom = new JSDOM(raw, { runScripts: 'outside-only' });
  const d = dom.window.document;
  const main = d.querySelector('main') || d.body;
  // Sections sit inside a wrapper div within <main>; grab all sections in main.
  const secs = [...main.querySelectorAll('section')];
  return {
    name: p.name, dir: p.dir,
    hasHeader: !!d.querySelector('header'),
    sectionCount: secs.length,
    sections: secs.map((s) => { const c = cls(s); return { label: label(s, raw), bg: bg(c), padding: pad(c), text: c.find((x) => x.startsWith('text-')) || '', heading: head(s), grids: grids(s) }; }),
    footerStart: d.querySelector('footer') ? d.querySelector('footer').outerHTML.slice(0, 160) : null,
  };
}

(async () => {
  const res = [];
  for (const p of PAGES) res.push(await analyze(p));
  await fs.writeFile(path.join(root, 'visual-reference', 'structure.json'), JSON.stringify(res, null, 2));
  for (const r of res) {
    process.stdout.write(`\n=== ${r.name} (${r.dir}) hasHeader=${r.hasHeader} sections=${r.sectionCount} ===\n`);
    r.sections.forEach((s, i) => {
      process.stdout.write(`  [${i + 1}] ${s.label || '-'} | ${s.bg} ${s.padding} ${s.text}\n`);
      if (s.heading) process.stdout.write(`       ${s.heading.tag}: "${s.heading.text}"\n`);
      s.grids.forEach((g, gi) => process.stdout.write(`       grid#${gi + 1} ${JSON.stringify(g.cols)} children=${g.children} cards=${g.cards}\n`));
    });
  }
  process.stdout.write('\nWrote visual-reference/structure.json\n');
})().catch((e) => { process.stderr.write(`${e.stack || e}\n`); process.exitCode = 1; });
