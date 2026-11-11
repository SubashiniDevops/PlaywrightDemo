// Slide 21: Complex widgets, shadow DOM, calendars, virtual lists
const { test, expect } = require('@playwright/test');

const BASE = 'https://the-internet.herokuapp.com';

// Date picker: the-internet has no date input, so this one uses a small inline page.
test('date picker: fill by label', async ({ page }) => {
  await page.setContent(`
    <label for="start">Start date</label>
    <input id="start" type="date">`);

  await page.getByLabel('Start date').fill('2026-09-10');
  await expect(page.getByLabel('Start date')).toHaveValue('2026-09-10');
});

// Open shadow DOM: normal Playwright locators pierce it.
test('shadow DOM: host is transparent to CSS locators', async ({ page }) => {
  await page.goto(`${BASE}/shadowdom`);

  const host = page.locator('my-paragraph').first();
  // The <p> lives inside the shadow root, and the locator still finds it.
  await expect(host.locator('p')).toBeVisible();
  await expect(host.locator('p')).toHaveCSS('background-color', 'rgb(102, 102, 102)');
  await expect(host.getByText("Let's have some different text!")).toBeVisible();
});

// Virtual list: scroll like a user until the target content appears.
// The page adds more paragraphs each time you scroll to the bottom.
test('infinite list: wheel scroll until the item renders', async ({ page }) => {
  await page.goto(`${BASE}/infinite_scroll`);

  const paragraphs = page.locator('.jscroll-added');
  await page.mouse.move(400, 300);
  while ((await paragraphs.count()) < 10) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(200);
  }

  await expect(paragraphs.nth(9)).toBeVisible();
});
