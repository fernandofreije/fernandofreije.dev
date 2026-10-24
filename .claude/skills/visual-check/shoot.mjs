// Screenshots every scene at several viewports and reports console errors and page weight.
// Usage: node shoot.mjs [--url http://localhost:8080] [--only desktop,mobile] [--reduced-motion]
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';

const { values: opts } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:8080/' },
    only: { type: 'string' },
    'reduced-motion': { type: 'boolean', default: false },
  },
});

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  ultrawide: { width: 2560, height: 1080 },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};
const BROWSERS = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

const outDir = path.resolve(import.meta.dirname, '../../../.shots');
mkdirSync(outDir, { recursive: true });

const executablePath = BROWSERS.find((p) => existsSync(p));
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const selected = opts.only ? opts.only.split(',') : Object.keys(VIEWPORTS);

for (const name of selected) {
  const context = await browser.newContext({
    viewport: VIEWPORTS[name],
    ...VIEWPORTS[name],
    reducedMotion: opts['reduced-motion'] ? 'reduce' : 'no-preference',
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
    await page.screenshot({ path: path.join(outDir, `${name}-${id}.png`) });
  }
  await page.screenshot({ path: path.join(outDir, `${name}-full.png`), fullPage: true });

  const kb = (n) => `${Math.round(n / 1024)}KB`;
  console.log(`${name}: first view ${kb(initialBytes)}, total ${kb(bytes)}`);
  for (const p of problems) console.log(`  ! ${p}`);
  await context.close();
}

await browser.close();
console.log(`screenshots in ${outDir}`);
