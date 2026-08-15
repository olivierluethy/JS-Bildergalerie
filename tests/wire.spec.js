import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Data URL of a valid, decodable image used to simulate a cached image.
const dataUrl =
  'data:image/png;base64,' +
  readFileSync(new URL('./fixtures/sample.png', import.meta.url)).toString('base64');

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/wire-harness.html');
  await page.waitForFunction(() => window.__ready === true);
});

// Regression guard for the "image only shows after Enlarge" bug: a cached image
// can report complete=true while naturalWidth is still 0 (mid-decode). The old
// code called fail() and hid it. wireCardImage must keep it visible.
test('keeps a cached, still-decoding image visible (no false broken state)', async ({
  page,
}) => {
  const res = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode(); // fully loaded + decoded
    // Simulate the race: complete stays true, but width reads 0.
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

    // Wire AFTER load, so no load event can rescue it — the cached situation.
    window.wireCardImage(card);
    await new Promise((r) => setTimeout(r, 250));
    return {
      display: img.style.display || getComputedStyle(img).display,
      brokenShown: !broken.hidden,
    };
  }, dataUrl);

  expect(res.display).not.toBe('none');
  expect(res.brokenShown).toBe(false);
});

// The error path must still work: a genuinely broken URL shows the overlay.
test('shows the broken overlay when the image truly fails to load', async ({ page }) => {
  const res = await page.evaluate(async () => {
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
    return { brokenShown: !broken.hidden, display: img.style.display };
  });

  expect(res.brokenShown).toBe(true);
});
