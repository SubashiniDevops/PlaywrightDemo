// Playwright (JavaScript): multiple windows & tabs - capture before click
// Fully offline: pages are served from a fake origin using context.route().
const { test, expect } = require('@playwright/test');

const BASE = 'https://app.test';

const pages = {
  '/home': `
    <h1>Home</h1>
    <a href="/invoice" target="_blank">Open invoice</a>
    <button onclick="window.open('/preview', '_blank', 'width=500,height=400')">Preview</button>`,
  '/invoice': `<title>Invoice page</title><h1>Invoice</h1><p>Total: $65</p>`,
  '/preview': `<title>Preview page</title><p>Preview ready</p>`,
};

// Serve the fake pages for every page opened in this context (including new tabs/popups)
test.beforeEach(async ({ context }) => {
  await context.route(`${BASE}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = pages[path];
    return body
      ? route.fulfill({ status: 200, contentType: 'text/html', body })
      : route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not found' });
  });
});

// 1. New tab: wait on the CONTEXT for the 'page' event, before the click
test('new tab - context.waitForEvent("page")', async ({ page }) => {
  await page.goto(`${BASE}/home`);

  // Start waiting BEFORE the action that opens the tab
  const pagePromise = page.context().waitForEvent('page');
  await page.getByRole('link', { name: 'Open invoice' }).click();
  const invoice = await pagePromise;
  await invoice.waitForLoadState();

  // Use the returned Page object for assertions and interactions
  await expect(invoice).toHaveURL(/invoice/);
  await expect(invoice.getByRole('heading', { name: 'Invoice' })).toBeVisible();

  // Close the child page when it is no longer part of the flow
  await invoice.close();

  // The original page is still usable
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
});

// 2. Popup window: wait on the PAGE for the 'popup' event, before the click
test('popup - page.waitForEvent("popup")', async ({ page }) => {
  await page.goto(`${BASE}/home`);

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Preview' }).click();
  const popup = await popupPromise;

  await expect(popup.getByText('Preview ready')).toBeVisible();
  await popup.close();
});

// 3. Same new-tab flow using Promise.all (waits and clicks together)
test('new tab - Promise.all pattern', async ({ page }) => {
  await page.goto(`${BASE}/home`);

  const [invoice] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('link', { name: 'Open invoice' }).click(),
  ]);

  await expect(invoice).toHaveURL(`${BASE}/invoice`);
  await expect(invoice).toHaveTitle('Invoice page');
  await invoice.close();
});

// 4. Count and switch between open pages in the context
test('track all open pages in the context', async ({ page, context }) => {
  await page.goto(`${BASE}/home`);
  expect(context.pages()).toHaveLength(1);

  const pagePromise = context.waitForEvent('page');
  await page.getByRole('link', { name: 'Open invoice' }).click();
  const invoice = await pagePromise;
  await invoice.waitForLoadState();
  expect(context.pages()).toHaveLength(2);

  await invoice.close();
  expect(context.pages()).toHaveLength(1);

  // Bring the original page back to the front
  await page.bringToFront();
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
});
