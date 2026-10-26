// wait-strategies-live.spec.ts
// Slide 13 demo: "Wait strategies: a decision tree"
// Uses a real public practice site: https://the-internet.herokuapp.com
//
// SETUP (once):
//   npm init -y
//   npm i -D @playwright/test
//   npx playwright install chromium
//
// RUN (visible browser, one test at a time so the class can follow):
//   npx playwright test wait-strategies-live.spec.ts --headed --workers=1
//   Run a single step:  npx playwright test -g "STEP 1" --headed
//   Step through live:  npx playwright test -g "STEP 1" --debug

import { test, expect } from '@playwright/test';

const BASE = 'https://the-internet.herokuapp.com';

// ---------------------------------------------------------------------------
// STEP 1 | Decision tree box 1: "Can a Playwright action auto-wait?"
// Answer: YES -> just use locator.click / fill / check. No extra wait code.
// Page: /dynamic_controls  (a text box that is DISABLED until you click Enable)
// ---------------------------------------------------------------------------
test('STEP 1: action auto-wait (fill waits until the input is enabled)', async ({ page }) => {
  // 1a. Open the page. goto() already waits for the "load" event.
  await page.goto(`${BASE}/dynamic_controls`);

  // 1b. Click "Enable". The server takes ~3 seconds to enable the input.
  //     Notice we do NOT wait for the request to finish here.
  await page.getByRole('button', { name: 'Enable' }).click();

  // 1c. fill() runs "actionability checks" first: element is attached,
  //     visible, ENABLED and EDITABLE. While the input is still disabled,
  //     Playwright keeps retrying. So this line pauses ~3s by itself,
  //     then types. No sleep needed.
  const textbox = page.getByRole('textbox');
  await textbox.fill('Auto-wait worked!');

  // 1d. Prove it. (Assertions are covered in STEP 2.)
  await expect(textbox).toHaveValue('Auto-wait worked!');
});

// ---------------------------------------------------------------------------
// STEP 2 | Decision tree box 2: "Is the expected UI visible?"
// Answer: use a web-first assertion: await expect(locator)...
// Page: /dynamic_loading/1  ("Hello World!" is hidden, appears after Start)
// ---------------------------------------------------------------------------
test('STEP 2: web-first assertion (expect retries until UI is visible)', async ({ page }) => {
  await page.goto(`${BASE}/dynamic_loading/1`);

  // 2a. Result text exists in the DOM but is hidden right now.
  const result = page.locator('#finish');
  await expect(result).toBeHidden();

  // 2b. Click Start. A loading bar shows for ~5s, then the text appears.
  await page.getByRole('button', { name: 'Start' }).click();

  // 2c. expect(locator) is "web-first": it re-checks the page again and
  //     again until the condition is true or the timeout (default 5s) hits.
  //     Passes the moment the text appears. No fixed sleep.
  //     (Loading takes ~5s, so we raise this assertion's timeout to 10s.)
  await expect(result).toHaveText('Hello World!', { timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// STEP 3 | Decision tree box 3: "Is navigation involved?"
// Answer: use toHaveURL (or waitForURL).
// Page: /login  (log in -> redirected to /secure)
// ---------------------------------------------------------------------------
test('STEP 3: navigation (toHaveURL waits for the redirect)', async ({ page }) => {
  await page.goto(`${BASE}/login`);

  // 3a. Fill the form. Credentials are published on the page itself.
  await page.getByLabel('Username').fill('tomsmith');
  await page.getByLabel('Password').fill('SuperSecretPassword!');

  // 3b. Click Login. This triggers a navigation to /secure.
  await page.getByRole('button', { name: 'Login' }).click();

  // 3c. Wait for the URL to change. Retries until it matches.
  await expect(page).toHaveURL(/\/secure/);

  // 3d. Also confirm the UI landed in the right state.
  await expect(page.locator('#flash')).toContainText('You logged into a secure area!');
});

// ---------------------------------------------------------------------------
// STEP 4a | Decision tree box 4: "No UI signal?" -> wait for an EVENT
// Page: /download  (clicking a link downloads a file; the page doesn't change)
// ---------------------------------------------------------------------------
test('STEP 4a: event wait (download has no UI change to assert)', async ({ page }) => {
  await page.goto(`${BASE}/download`);

  // 4a-1. Start listening BEFORE the click. If you click first, the
  //       download event may fire before you listen, and you'd miss it.
  //       Note: no "await" here, we only create the promise.
  const downloadPromise = page.waitForEvent('download');

  // 4a-2. Click the first file link on the page.
  await page.locator('.example a').first().click();

  // 4a-3. NOW await the event. Resolves when the download starts.
  const download = await downloadPromise;

  // 4a-4. Verify something real about the download.
  console.log('Downloaded file:', download.suggestedFilename());
  expect(download.suggestedFilename()).not.toBe('');
});

// ---------------------------------------------------------------------------
// STEP 4b | "No UI signal?" -> wait for a network RESPONSE
// Page: /status_codes  (each link requests a URL that returns that status)
// ---------------------------------------------------------------------------
test('STEP 4b: response wait (assert on the network call itself)', async ({ page }) => {
  await page.goto(`${BASE}/status_codes`);

  // 4b-1. Again: listen first. The predicate says which response we want.
  const responsePromise = page.waitForResponse(
    (res) => res.url().endsWith('/status_codes/404')
  );

  // 4b-2. Click the "404" link.
  await page.getByRole('link', { name: '404' }).click();

  // 4b-3. Await the response and check its status code.
  const response = await responsePromise;
  expect(response.status()).toBe(404);
});

// ---------------------------------------------------------------------------
// STEP 5 | "Avoid this unless demonstrating timing"
// Compare a fixed sleep with a web-first assertion on the same page.
// ---------------------------------------------------------------------------
test('STEP 5: why waitForTimeout is a bad idea (teaching only)', async ({ page }) => {
  await page.goto(`${BASE}/dynamic_loading/1`);
  await page.getByRole('button', { name: 'Start' }).click();

  // 5a. BAD: always burns the full time. Too long = slow suite.
  //     Too short (say 2000) = flaky failures when the server is slow.
  let t = Date.now();
  await page.waitForTimeout(8000);
  console.log(`Fixed sleep always costs: ${Date.now() - t} ms`);

  // 5b. Repeat the flow and use the proper wait instead.
  await page.goto(`${BASE}/dynamic_loading/1`);
  await page.getByRole('button', { name: 'Start' }).click();
  t = Date.now();
  await expect(page.locator('#finish')).toHaveText('Hello World!', { timeout: 10_000 });
  console.log(`expect() costs only what the app needs: ${Date.now() - t} ms`);
});