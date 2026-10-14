// Playwright (JavaScript): multiple windows & tabs on real URLs
// Rule: start waiting for the new page BEFORE the click that opens it.
const { test, expect } = require('@playwright/test');

// 1. the-internet: link opens a new tab
test('the-internet - new window via link', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/windows');

  const pagePromise = page.context().waitForEvent('page');
  await page.getByRole('link', { name: 'Click Here' }).click();
  const newTab = await pagePromise;
  await newTab.waitForLoadState();

  await expect(newTab).toHaveURL(/windows\/new/);
  await expect(newTab.getByRole('heading', { name: 'New Window' })).toBeVisible();
  await newTab.close();

  // Original tab is still available
  await expect(page.getByRole('heading', { name: 'Opening a new window' })).toBeVisible();
});

// 2. demoqa: New Tab button
test('demoqa - new tab button', async ({ page }) => {
  await page.goto('https://demoqa.com/browser-windows');

  const pagePromise = page.context().waitForEvent('page');
  await page.locator('#tabButton').click();
  const newTab = await pagePromise;
  await newTab.waitForLoadState();

  await expect(newTab).toHaveURL(/sample/);
  await expect(newTab.locator('#sampleHeading')).toHaveText('This is a sample page');
  await newTab.close();
});

// 3. demoqa: New Window button (popup window)
test('demoqa - new window button', async ({ page }) => {
  await page.goto('https://demoqa.com/browser-windows');

  const popupPromise = page.waitForEvent('popup');
  await page.locator('#windowButton').click();
  const popup = await popupPromise;
  await popup.waitForLoadState();

  await expect(popup.locator('#sampleHeading')).toHaveText('This is a sample page');
  await popup.close();
});

// 4. Link with target=_blank to a real site (only needs example.com)
test('example.com - target=_blank link', async ({ page }) => {
  await page.setContent(`<a href="https://example.com" target="_blank">Open example</a>`);

  const [newTab] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('link', { name: 'Open example' }).click(),
  ]);
  await newTab.waitForLoadState();

  await expect(newTab).toHaveTitle('Example Domain');
  await expect(newTab.getByText("This domain ")).toBeVisible();
  await newTab.close();
});

// 5. Open several tabs yourself and switch between them
test('open multiple tabs with context.newPage()', async ({ context }) => {
  const tab1 = await context.newPage();
  await tab1.goto('https://example.com');

  const tab2 = await context.newPage();
  await tab2.goto('https://playwright.dev');

  expect(context.pages()).toHaveLength(2);
  await expect(tab1).toHaveTitle('Example Domain');
  await expect(tab2).toHaveTitle(/Playwright/);

  // Switch back to the first tab
  await tab1.bringToFront();
  await expect(tab1.getByText("This domain is for use")).toBeVisible();

  await tab2.close();
  expect(context.pages()).toHaveLength(1);
});