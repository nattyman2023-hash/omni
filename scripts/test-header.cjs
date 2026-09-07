/** Header navigation test — checks wrapping, overflow and control visibility at 7 widths. */
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173';
const WIDTHS = [1280, 1366, 1440, 1600, 1920, 768, 390];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 1000 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(800);
    const m = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Primary navigation"]');
      const navLinks = nav ? [...nav.querySelectorAll('a')] : [];
      const wrapping = navLinks.filter((a) => {
        // Check if the link text actually wraps to multiple lines
        const range = document.createRange();
        range.selectNodeContents(a);
        const rects = range.getClientRects();
        return rects.length > 1; // more than one line = wrapped
      }).map((a) => a.textContent.trim());
      const header = document.querySelector('header');
      const headerRect = header ? header.getBoundingClientRect() : null;
      const phoneLink = document.querySelector('a[href*="tel:+447928149731"]');
      const quoteBtn = [...document.querySelectorAll('a')].find((a) => a.textContent.includes('Get Free Quote') || a.textContent.includes('Quote'));
      const menuBtn = document.querySelector('button[aria-label*="menu"]');
      return {
        navVisible: nav ? getComputedStyle(nav).display !== 'none' : false,
        navLinkCount: navLinks.length,
        wrappingLinks: wrapping,
        headerHeight: headerRect ? Math.round(headerRect.height) : null,
        phoneVisible: phoneLink ? getComputedStyle(phoneLink).display !== 'none' : false,
        quoteVisible: !!quoteBtn,
        menuBtnVisible: menuBtn ? getComputedStyle(menuBtn).display !== 'none' : false,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    results.push({ width: w, ...m });
    await ctx.close();
  }
  await browser.close();
  process.stdout.write('\n=== HEADER NAVIGATION TEST ===\n');
  let defects = 0;
  for (const r of results) {
    const wrapDef = r.wrappingLinks.length > 0 ? ` WRAP:${r.wrappingLinks.join(',')}` : '';
    const ovfDef = r.overflow ? ' OVERFLOW' : '';
    if (wrapDef || ovfDef) defects++;
    process.stdout.write(`  ${r.width}px: nav=${r.navVisible} links=${r.navLinkCount} headerH=${r.headerHeight} phone=${r.phoneVisible} quote=${r.quoteVisible} menu=${r.menuBtnVisible}${wrapDef}${ovfDef}\n`);
  }
  process.stdout.write(`\nDefects: ${defects}\n`);
})();
