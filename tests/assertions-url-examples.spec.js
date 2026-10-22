// Playwright (JavaScript): retrying expectations against real public sample sites
// Sites used (no login needed unless noted):
//   https://playwright.dev                    - official Playwright docs
//   https://demo.playwright.dev/todomvc       - TodoMVC demo app (items added dynamically)
//   https://www.saucedemo.com                 - demo shop (login: standard_user / secret_sauce)
//   https://jsonplaceholder.typicode.com      - free fake REST API

// Import `test` (defines tests) and `expect` (assertions)
const { test, expect } = require('@playwright/test');

// 1. WEB-FIRST: async matchers retry until true or the timeout (default 5 s)
test('web-first: title, link and heading on playwright.dev', async ({ page }) => {
  // Open the Playwright home page
  await page.goto('https://playwright.dev/');

  // Retries until the page title matches the regex
  await expect(page).toHaveTitle(/Playwright/);

  // Retries until the "Get started" link is visible on the page
  await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();

  // Click it, then retry-check that the URL changed to the intro page
  await page.getByRole('link', { name: 'Get started' }).click();
  await expect(page).toHaveURL(/.*intro/);

  // Retries until the main heading contains the text "Installation"
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});

// 1b. WEB-FIRST with dynamic UI: items are added after user actions
test('web-first: TodoMVC list count updates', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');

  // Find the input box by its placeholder text
  const input = page.getByPlaceholder('What needs to be done?');

  // Add two todo items (type text, press Enter)
  await input.fill('Buy milk');
  await input.press('Enter');
  await input.fill('Write tests');
  await input.press('Enter');

  // Retries until exactly 2 items are in the list
  await expect(page.getByTestId('todo-title')).toHaveCount(2);

  // Retries until the list text matches the exact items in order
  await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Write tests']);

  // Retries until the footer counter shows "2 items left"
  await expect(page.getByTestId('todo-count')).toContainText('2 items left');
});

// 2. SOFT CHECKS: collect multiple failures when validating a summary page
test('soft checks: validate several values after login on saucedemo', async ({ page }) => {
  // Log in to the demo shop
  await page.goto('https://www.saucedemo.com/');
  await page.getByPlaceholder('Username').fill('standard_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();

  // expect.soft records a failure but keeps the test running,
  // so ALL wrong values are reported in one run, not just the first
  await expect.soft(page).toHaveURL(/inventories/);
  await expect.soft(page.locator('.title')).toHaveText('Products');
  await expect.soft(page.locator('.inventory_item')).toHaveCount(6);
  await expect.soft(page.locator('.shopping_cart_link')).toBeVisible();

  // Optional: stop here if any soft check above already failed
  expect(test.info().errors).toHaveLength(1);
});

// 3. AVOID: immediate checks such as isVisible() do not retry
test('avoid: isVisible() on a dynamic element is flaky', async ({ page }) => {
  // Expected to fail, to demonstrate the problem
   test.fail();
  await page.goto('https://demo.playwright.dev/todomvc');
  const input = page.getByPlaceholder('What needs to be done?');
  await input.fill('Buy milk');
  await input.press('Enter');

  // BAD: evaluated once, immediately; it does not wait for UI updates
  expect(await page.getByTestId('todo-count').isVisible()).toBe(true);
});

// 3b. The right way for the same check
test('right way: toBeVisible() retries', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');
  const input = page.getByPlaceholder('What needs to be done?');
  await input.fill('Buy milk');
  await input.press('Enter');

  // GOOD: retries until the counter appears or the timeout is reached
  await expect(page.getByTestId('todo-count')).toBeVisible();
});

// 4. POLL: retry non-DOM state such as an API response
test('expect.poll: wait for an API value', async ({ page }) => {
  // Runs the function repeatedly until its result equals the expected value
  await expect
    .poll(
      async () => {
        // Call a real public API using Playwright's request client
        const res = await page.request.get('https://jsonplaceholder.typicode.com/todos/1');
        // Return one field from the JSON body to compare
        return (await res.json()).title;
      },
      // Give up after 30 s; wait 500 ms between attempts
      { timeout: 30_000, intervals: [500] }
    )
    // The value we expect to eventually see
    .toBe('delectus aut autem');
});

// 4b. Check status code and JSON shape of an API with normal expects
test('api: status and body checks', async ({ request }) => {
  // GET a sample post
  const res = await request.get('https://jsonplaceholder.typicode.com/posts/1');

  // Retrying matcher for the response: passes when status is 200-299
  await expect(res).toBeOK();

  // Read the JSON body and check selected fields
  const body = await res.json();
  expect(body.id).toBe(1);
  expect(body).toHaveProperty('title');
});
