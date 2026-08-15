// Self-contained browser verification (uses Playwright's Chromium directly,
// in-process). Use this where the full `playwright test` runner can't spawn
// worker/browser subprocesses (sandboxes, some CI). Run: npm run verify:browser
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PORT = 8921;
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT = new URL('..', import.meta.url).pathname;

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
  cwd: ROOT,
  stdio: 'ignore',
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1000);

const dataUrl =
  'data:image/png;base64,' +
  readFileSync(new URL('./fixtures/sample.png', import.meta.url)).toString('base64');

const checks = [];
const record = (name, pass, detail) => {
  checks.push({ name, pass });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (detail) console.log('        ', JSON.stringify(detail));
};

const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage();
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith(BASE) || u.startsWith('data:')) route.continue();
    else route.abort();
  });

  // 1) Unit: cached, still-decoding image (complete=true, naturalWidth=0) stays visible.
  await page.goto(`${BASE}/tests/wire-harness.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ready === true);
  const unit = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    Object.defineProperty(img, 'naturalWidth', { configurable: true, get: () => 0 });
    const card = document.createElement('article');
    card.setAttribute('data-card', '');
    const shimmer = document.createElement('div');
    shimmer.setAttribute('data-shimmer', '');
    img.setAttribute('data-thumb', '');
    const broken = document.createElement('div');
    broken.setAttribute('data-broken', '');
    broken.hidden = true;
    card.append(shimmer, img, broken);
    document.body.append(card);
    window.wireCardImage(card);
    await new Promise((r) => setTimeout(r, 250));
    return { display: img.style.display, brokenShown: !broken.hidden };
  }, dataUrl);
  record(
    'cached, still-decoding image stays visible (no false broken state)',
    unit.display !== 'none' && unit.brokenShown === false,
    unit,
  );

  // 2) Unit: a genuinely broken image shows the broken overlay.
  const brokenCheck = await page.evaluate(async () => {
    const card = document.createElement('article');
    card.setAttribute('data-card', '');
    const shimmer = document.createElement('div');
    shimmer.setAttribute('data-shimmer', '');
    const img = new Image();
    img.setAttribute('data-thumb', '');
    const broken = document.createElement('div');
    broken.setAttribute('data-broken', '');
    broken.hidden = true;
    card.append(shimmer, img, broken);
    document.body.append(card);
    window.wireCardImage(card);
    img.src = '/tests/fixtures/definitely-missing-image.png';
    await new Promise((resolve) => {
      img.addEventListener('error', () => setTimeout(resolve, 50), { once: true });
      setTimeout(resolve, 3000);
    });
    return { brokenShown: !broken.hidden };
  });
  record('genuinely broken image shows the broken overlay', brokenCheck.brokenShown === true, brokenCheck);

  // 3) Integration: add an image via the modal, it renders on the homepage.
  await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.click('#addBtn');
  await page.fill('#urlInput', `${BASE}/tests/fixtures/sample.png`);
  await page.waitForSelector('[data-confirm]:not([disabled])', { timeout: 7000 });
  await page.click('[data-confirm]');
  await page.waitForSelector('[data-card]', { timeout: 7000 });
  await sleep(400);
  const addState = await page.evaluate(() => {
    const img = document.querySelector('[data-card] [data-thumb]');
    const broken = document.querySelector('[data-card] [data-broken]');
    return {
      naturalWidth: img.naturalWidth,
      display: getComputedStyle(img).display,
      brokenShown: broken ? !broken.hidden : null,
    };
  });
  record(
    'added image is visible on the homepage without any click',
    addState.naturalWidth > 0 && addState.display !== 'none' && addState.brokenShown === false,
    addState,
  );

  // 4) Integration: still visible after a reload (cached path).
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-card]', { timeout: 7000 });
  await sleep(400);
  const reloadState = await page.evaluate(() => {
    const img = document.querySelector('[data-card] [data-thumb]');
    const broken = document.querySelector('[data-card] [data-broken]');
    return {
      naturalWidth: img.naturalWidth,
      display: getComputedStyle(img).display,
      brokenShown: broken ? !broken.hidden : null,
    };
  });
  record(
    'image stays visible after reload (cached/complete path)',
    reloadState.naturalWidth > 0 && reloadState.display !== 'none' && reloadState.brokenShown === false,
    reloadState,
  );
} finally {
  await browser.close();
  server.kill('SIGKILL');
}

const failed = checks.filter((c) => !c.pass).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
process.exit(failed ? 1 : 0);
