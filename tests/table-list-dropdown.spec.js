// Slide 20: Complex web elements, tables, lists, dropdowns
const { test, expect } = require('@playwright/test');

const BASE = 'https://the-internet.herokuapp.com';

// Tables: scope to a row, then locate the cell or button inside it.
test('table: row by content', async ({ page }) => {
  await page.goto(`${BASE}/tables`);

  const table = page.locator('#table1');
  const row = table.getByRole('row', { name: /Conway/ });
  await expect(row.getByRole('cell', { name: '$50.00' })).toBeVisible();
  await row.getByRole('link', { name: 'edit' }).click();

  await expect(page).toHaveURL(/#edit/);
});

// Lists: assert count/text after data has loaded.
test('list: assertion', async ({ page }) => {
  await page.goto(BASE);

  const items = page.getByRole('listitem');
  await expect(items.first()).toHaveText('A/B Testing');
  await expect(items.filter({ hasText: 'Dropdown' })).toHaveCount(3);
});

// Lists: assert after data has loaded (content appears after a delay).
test('list: wait for loaded content', async ({ page }) => {
  await page.goto(`${BASE}/dynamic_loading/2`);

  await page.getByRole('button', { name: 'Start' }).click();

  await expect(page.locator('#finish')).toHaveText('Hello World!');
});

// Comboboxes: this page uses a native select, which has the combobox role.
test('dropdown: role locator', async ({ page }) => {
  await page.goto(`${BASE}/dropdown`);

  const dropdown = page.getByRole('combobox');
  await dropdown.selectOption('Option 1');

  await expect(dropdown).toHaveValue('1');
});

// Keyboard fallback: focus the control and use the keys, like a user.
test('dropdown: keyboard fallback', async ({ page }) => {
  await page.goto(`${BASE}/dropdown`);

  await page.getByRole('combobox').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');

  await expect(page.getByRole('combobox')).toHaveValue('2');
});
