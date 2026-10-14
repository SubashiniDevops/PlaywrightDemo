// Playwright practice: dynamic elements
// Practice site: https://the-internet.herokuapp.com
const { test, expect } = require('@playwright/test');

// 1. Element that exists in the DOM but is hidden, then becomes visible
test('Dynamic Loading 1 - hidden element appears', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/dynamic_loading/1');
  await page.getByRole('button', { name: 'Start' }).click();

  // Auto-wait: expect retries until the element is visible (default 5s, raised here)
  const result = page.locator('#finish');
  await expect(result).toBeVisible({ timeout: 60000 });
  await expect(result).toHaveText('Hello World!',{ timeout: 60000 });
});

// 2. Element that is NOT in the DOM until the action finishes
test('Dynamic Loading 2 - element rendered after the fact', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/dynamic_loading/2');
  await page.getByRole('button', { name: 'Start' }).click();

  await page.locator('#finish').waitFor({ state: 'visible', timeout: 60000 });
  await expect(page.locator('#finish h4')).toHaveText('Hello World!');
});

// 3. Element removed and added back, plus enabled/disabled input
test('Dynamic Controls - remove/add checkbox and enable input', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/dynamic_controls');

  // Remove the checkbox, wait for it to leave the DOM
  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.locator('#checkbox')).toHaveCount(0);
  await expect(page.locator('#message')).toHaveText("It's gone!");

  // Add it back
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.locator('#checkbox')).toBeVisible();

  // Enable the disabled text box
  const input = page.locator('#input-example input');
  await expect(input).toBeDisabled();
  await page.getByRole('button', { name: 'Enable' }).click();
  await expect(input).toBeEnabled();
  await input.fill('Playwright');
  await expect(input).toHaveValue('Playwright');
});

// 4. Locators that change on every load: dynamic ids and attributes
test('Dynamic Properties - stable locators for changing elements', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/challenging_dom');

  // Button ids change on each load, so locate by role/text, not by id
  await page.getByRole('link', { name: 'foo' }).first().click();
  await expect(page.locator('table')).toBeVisible();

  // Pick a table cell by its content instead of position
  const row = page.locator('table tbody tr', { hasText: 'Iuvaret0' });
  await expect(row).toBeVisible();
});

// 5. Polling for a condition with expect.poll
test.only('expect.poll - wait for a changing value', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/dynamic_loading/1');
  await page.getByRole('button', { name: 'Start' }).click();

  await expect
    .poll(async () => page.locator('#finish').isVisible(), { timeout: 10000 })
    .toBe(true);
});
