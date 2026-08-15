import { test, expect } from '@playwright/test';

const IMG = '/tests/fixtures/sample.png';
const IMG2 = '/tests/fixtures/sample2.png';

// Full URL the app will store (same-origin, deterministic, no external network).
function abs(baseURL, path) {
  return new URL(path, baseURL).toString();
}

// Block external hosts (Google Fonts, favicons) — irrelevant here and keeps the
// run fully local and fast.
test.beforeEach(async ({ page, baseURL }) => {
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith(baseURL) || u.startsWith('data:')) route.continue();
    else route.abort();
  });
});

async function freshApp(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
}

async function addImageViaModal(page, baseURL, path) {
  await page.click('#addBtn');
  const input = page.locator('#urlInput');
  await input.fill(abs(baseURL, path));
  // Live preview must validate before the confirm button enables.
  await expect(page.locator('[data-confirm]')).toBeEnabled();
  await page.click('[data-confirm]');
}

// Assert a gallery card actually shows its picture with no click/hover.
async function expectThumbnailVisible(page) {
  const card = page.locator('[data-card]').first();
  await expect(card).toBeVisible();
  const thumb = card.locator('[data-thumb]');

  // 1) The broken overlay must NOT be showing.
  await expect(card.locator('[data-broken]')).toBeHidden();

  // 2) The image element is actually visible (not display:none / opacity 0).
  await expect(thumb).toBeVisible();

  // 3) The image really decoded to pixels.
  await expect
    .poll(async () => thumb.evaluate((el) => el.naturalWidth), {
      message: 'thumbnail naturalWidth should be > 0',
    })
    .toBeGreaterThan(0);

  // 4) Computed style is genuinely visible.
  const style = await thumb.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { opacity: cs.opacity, display: cs.display, visibility: cs.visibility };
  });
  expect(style.display).not.toBe('none');
  expect(style.visibility).not.toBe('hidden');
  expect(Number(style.opacity)).toBeGreaterThan(0);
}

test('added image is visible on the homepage immediately (no click needed)', async ({
  page,
  baseURL,
}) => {
  await freshApp(page);
  await addImageViaModal(page, baseURL, IMG);
  await expect(page.locator('[data-card]')).toHaveCount(1);
  await expectThumbnailVisible(page);
});

test('image stays visible after a page reload (cached / complete path)', async ({
  page,
  baseURL,
}) => {
  await freshApp(page);
  await addImageViaModal(page, baseURL, IMG);
  await expect(page.locator('[data-card]')).toHaveCount(1);

  // Reload: every card image now renders from cache with img.complete === true
  // synchronously — the exact condition that tripped the false broken state.
  await page.reload();
  await expect(page.locator('[data-card]')).toHaveCount(1);
  await expectThumbnailVisible(page);
});

test('a second, different image is also visible', async ({ page, baseURL }) => {
  await freshApp(page);
  await addImageViaModal(page, baseURL, IMG);
  await addImageViaModal(page, baseURL, IMG2);
  await expect(page.locator('[data-card]')).toHaveCount(2);
  for (let i = 0; i < 2; i += 1) {
    const thumb = page.locator('[data-card]').nth(i).locator('[data-thumb]');
    await expect(page.locator('[data-card]').nth(i).locator('[data-broken]')).toBeHidden();
    await expect
      .poll(async () => thumb.evaluate((el) => el.naturalWidth))
      .toBeGreaterThan(0);
  }
});
