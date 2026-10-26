// popups-alerts.spec.ts
// Slide: "Popups & alerts: attach handler before trigger"
// Real practice site: https://the-internet.herokuapp.com
//
// SETUP (once):
//   npm i -D @playwright/test && npx playwright install chromium
// RUN:
//   npx playwright test popups-alerts.spec.ts --headed --workers=1
//   One step: npx playwright test -g "STEP 1" --headed

import { test, expect } from '@playwright/test';

const BASE = 'https://the-internet.herokuapp.com';

// ---------------------------------------------------------------------------
// STEP 1 | Slide code box "Dialogs": alert
// Rule: register the dialog listener BEFORE the click that triggers it.
// ---------------------------------------------------------------------------
test('STEP 1: alert, accept it and assert the message', async ({ page }) => {
  await page.goto(`${BASE}/javascript_alerts`);

  // 1a. page.once('dialog', ...) = "listen for the NEXT dialog only".
  //     (page.on would keep listening for every dialog.)
  //     Nothing runs yet: we are just registering the handler.
  page.once('dialog', async (dialog) => {
    // 1b. Dialog types: 'alert' | 'confirm' | 'prompt' | 'beforeunload'.
    console.log(`Dialog type: ${dialog.type()}`);

    // 1c. Message assertion, like the slide: check the text the user would see.
    expect(dialog.message()).toContain('I am a JS Alert');

    // 1d. Handle it. accept() = click OK. Dialogs are modal: the page is
    //     frozen until we do this.
    await dialog.accept();
  });

  // 1e. NOW click the control that triggers the alert.
  //     Handler is already attached, so it fires immediately.
  await page.getByRole('button', { name: 'Click for JS Alert' }).click();

  // 1f. Prove the page continued after the dialog was handled.
  await expect(page.locator('#result')).toHaveText('You successfully clicked an alert');
});

// ---------------------------------------------------------------------------
// STEP 2 | confirm: accept vs dismiss (the slide says "accept, dismiss")
// ---------------------------------------------------------------------------
test('STEP 2: confirm, accept then dismiss', async ({ page }) => {
  await page.goto(`${BASE}/javascript_alerts`);
  const confirmButton = page.getByRole('button', { name: 'Click for JS Confirm' });

  // 2a. Accept = user presses OK.
  page.once('dialog', (dialog) => dialog.accept());
  await confirmButton.click();
  await expect(page.locator('#result')).toHaveText('You clicked: Ok');

  // 2b. Dismiss = user presses Cancel. Register a NEW once() handler,
  //     because the first one was used up by the first dialog.
  page.once('dialog', (dialog) => dialog.dismiss());
  await confirmButton.click();
  await expect(page.locator('#result')).toHaveText('You clicked: Cancel');
});

// ---------------------------------------------------------------------------
// STEP 3 | prompt: accept with text
// ---------------------------------------------------------------------------
test('STEP 3: prompt, type a value into the dialog', async ({ page }) => {
  await page.goto(`${BASE}/javascript_alerts`);

  // 3a. accept('text') types into the prompt box, then presses OK.
  page.once('dialog', (dialog) => dialog.accept('Playwright class'));

  await page.getByRole('button', { name: 'Click for JS Prompt' }).click();
  await expect(page.locator('#result')).toHaveText('You entered: Playwright class');
});

// ---------------------------------------------------------------------------
// STEP 4 | Slide code box "Popup page": browser popup / new window
// Not a dialog: it is a NEW PAGE, so we wait for the 'popup' event.
// ---------------------------------------------------------------------------
test('STEP 4: popup window with waitForEvent("popup")', async ({ page }) => {
  await page.goto(`${BASE}/windows`);

  // 4a. Create the promise BEFORE the click. No await here, we are only
  //     starting to listen. Same "listener before trigger" rule.
  const popupPromise = page.waitForEvent('popup');

  // 4b. Click the link that opens a new window (target="_blank").
  await page.getByRole('link', { name: 'Click Here' }).click();

  // 4c. NOW await the promise. It resolves to the new Page object.
  const popup = await popupPromise;

  // 4d. The popup is a separate page with its own locators.
  //     Use "popup." not "page." from here on.
  await expect(popup.getByRole('heading', { name: 'New Window' })).toBeVisible();

  // 4e. The original page is still open and usable.
  await expect(page.getByRole('heading', { name: 'Opening a new window' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// STEP 5 | Slide "Gotcha": a dialog must be handled
// A listener that does NOT accept or dismiss leaves the page blocked.
// ---------------------------------------------------------------------------
test('STEP 5: gotcha, unhandled dialog blocks the page', async ({ page }) => {
  await page.goto(`${BASE}/javascript_alerts`);

  // 5a. Listener exists but never calls accept() or dismiss().
  page.once('dialog', (dialog) => {
    console.log(`Saw dialog "${dialog.message()}" but did nothing with it`);
  });

  // 5b. The click never finishes: the alert is still open, page is frozen.
  //     We use a short timeout so the demo fails fast and visibly.
  await expect(
    page.getByRole('button', { name: 'Click for JS Alert' }).click({ timeout: 3000 })
  ).rejects.toThrow();
  console.log('Click timed out: page is blocked waiting for the dialog.');

  // 5c. Note: with NO listener at all, Playwright auto-dismisses dialogs
  //     so tests don't hang. Registering a listener makes YOU responsible.
});
