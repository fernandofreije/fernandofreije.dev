// Screenshots every scene at several viewports and audits accessibility.
// Reports console errors, page weight, axe-core violations and horizontal overflow,
// and exits non-zero if any check fails.
//
// Usage: node shoot.mjs [--url http://localhost:8080] [--only desktop,mobile]
//                       [--reduced-motion] [--forced-colors]
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';

const { values: opts } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:8080/' },
    only: { type: 'string' },
    'reduced-motion': { type: 'boolean', default: false },
    'forced-colors': { type: 'boolean', default: false },
  },
});

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  ultrawide: { width: 2560, height: 1080 },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  // WCAG 1.4.10: content must reflow at 320 CSS px (equivalent to 400% zoom).
  reflow: { width: 320, height: 640 },
};
const BROWSERS = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'];
const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

const outDir = path.resolve(import.meta.dirname, '../../../.shots');
mkdirSync(outDir, { recursive: true });

const executablePath = BROWSERS.find((p) => existsSync(p));
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const selected = opts.only ? opts.only.split(',') : Object.keys(VIEWPORTS);
const mode = opts['forced-colors'] ? '-forced' : opts['reduced-motion'] ? '-reduced' : '';
let failures = 0;

for (const name of selected) {
  const context = await browser.newContext({
    viewport: VIEWPORTS[name],
    ...VIEWPORTS[name],
    reducedMotion: opts['reduced-motion'] ? 'reduce' : 'no-preference',
    forcedColors: opts['forced-colors'] ? 'active' : 'none',
  });
  const page = await context.newPage();
  const problems = [];
  let bytes = 0;
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && problems.push(`console.${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`failed: ${r.url()}`));
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`);
    bytes += Number(r.headers()['content-length'] ?? 0);
  });

  await page.goto(opts.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const initialBytes = bytes;

  const scenes = await page.$$eval('.scene', (els) => els.map((el) => el.id));
  for (const id of scenes) {
    await page.evaluate((sceneId) => document.getElementById(sceneId).scrollIntoView({ behavior: 'instant' }), id);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500); // let reveal transitions and the first animation beats settle
    await page.screenshot({ path: path.join(outDir, `${name}${mode}-${id}.png`) });
  }
  await page.screenshot({ path: path.join(outDir, `${name}${mode}-full.png`), fullPage: true });

  // Accessibility: every scene has been revealed by now, so axe sees the final state.
  // Contrast over the illustrations can't be computed by axe and comes back as "incomplete".
  await page.addScriptTag({ path: axePath });
  const { violations } = await page.evaluate((tags) => axe.run(document, { runOnly: tags }), AXE_TAGS);
  for (const v of violations) {
    problems.push(`axe ${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
  }
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  if (scrollWidth > VIEWPORTS[name].width) {
    problems.push(`horizontal overflow: page is ${scrollWidth}px wide in a ${VIEWPORTS[name].width}px viewport`);
  }

  const kb = (n) => `${Math.round(n / 1024)}KB`;
  console.log(`${name}${mode}: first view ${kb(initialBytes)}, total ${kb(bytes)}, ${problems.length} problem(s)`);
  for (const p of problems) console.log(`  ! ${p}`);
  failures += problems.length;
  await context.close();
}

await browser.close();
console.log(`screenshots in ${outDir}`);
process.exit(failures ? 1 : 0);
