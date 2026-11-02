// keyboard-actions.spec.ts
// Slide: "Keyboard actions: shortcuts and precise input"
// Real practice site: https://the-internet.herokuapp.com
//
// SETUP (once):
//   npm i -D @playwright/test && npx playwright install chromium
// RUN:
//   npx playwright test keyboard-actions.spec.ts --headed --workers=1
//   One step: npx playwright test -g "STEP 1" --headed

import { test, expect } from '@playwright/test';

const BASE = 'https://the-internet.herokuapp.com';

// ---------------------------------------------------------------------------
// STEP 1 | Bullet 1: "Use fill() for most text fields"
// fill() sets the whole value at once. It is fast and reliable.
// Page: /login
// ---------------------------------------------------------------------------
test('STEP 1: fill, the default way to enter text', async ({ page }) => {
  await page.goto(`${BASE}/login`);

  // 1a. fill() waits until the field is visible, enabled and editable,
  //     clears any old text, then sets the new value in one step.
  await page.getByLabel('Username').fill('tomsmith');

  // 1b. Assert the input state. This is exactly what the slide tip means:
  //     fill gives a predictable value in the input.
  await expect(page.getByLabel('Username')).toHaveValue('tomsmith');
});

// ---------------------------------------------------------------------------
// STEP 2 | Bullet 2: "Use press() for shortcuts, navigation keys and
// keyboard-only flows"
// Page: /key_presses (shows the last key pressed in the text box)
// ---------------------------------------------------------------------------
test('STEP 2: press, single keys and shortcuts', async ({ page }) => {
  await page.goto(`${BASE}/key_presses`);

  const input = page.locator('#target');
  const result = page.locator('#result');

  // 2a. Click the field so it has keyboard focus. Keys go to the focused element.
  await input.click();

  // 2b. locator.press() sends ONE key (or a combo) to that element.
  //     'Enter' is a navigation key, not text. The page reports the key name.
  // await input.press('Enter');
  // await expect(result).toHaveText('You entered: ENTER');

  // 2c. Combos use +, as on the slide ('Control+K').
  //     The page reports the last key in the combo.
  await input.press('Control+K');
  //after press below text gone or removed in fraction of sec
  await expect(result).toHaveText('You entered: K');

  // 2d. page.keyboard.press() sends the key to whatever is focused
  //     on the page, with no locator. Use it for global shortcuts.
  await page.keyboard.press('Tab');
  await expect(result).toHaveText('You entered: TAB');
});

// ---------------------------------------------------------------------------
// STEP 3 | Slide left box lines 7-8: ArrowDown / Enter on a control
// Page: /inputs (a number field that changes with the arrow keys)
// ---------------------------------------------------------------------------
test('STEP 3: navigation keys on a control', async ({ page }) => {
  await page.goto(`${BASE}/inputs`);
  const number = page.getByRole('spinbutton');

  // 3a. Start from a known value.
  await number.fill('5');

  // 3b. ArrowUp adds 1, ArrowDown subtracts 1 (same idea as ArrowDown
  //     moving through options in a combobox).
  await number.press('ArrowUp');
  await expect(number).toHaveValue('6');

  await number.press('ArrowDown');
  await number.press('ArrowDown');
  await expect(number).toHaveValue('4');
});

// ---------------------------------------------------------------------------
// STEP 4 | Bullet 3: "Use pressSequentially() only when key-by-key events
// are required" (for example OTP boxes, search-as-you-type, key handlers)
// Page: /key_presses again. It reacts to keydown events.
// ---------------------------------------------------------------------------
test('STEP 4: fill vs pressSequentially', async ({ page }) => {
  await page.goto(`${BASE}/key_presses`);
  const input = page.locator('#target');
  const result = page.locator('#result');

  // 4a. fill() sets the value directly. NO key events fire, so the page
  //     never learns that keys were "pressed". The result stays empty.
  await input.fill('123');
  await expect(result).toHaveText('');

  // 4b. pressSequentially() types one character at a time and fires the
  //     real keydown, keypress and keyup events for each.
  //     delay: 50 waits 50 ms between keys, like a slow typist.
  await input.pressSequentially('456', { delay: 50 });

  // 4c. The page saw each key. The last one was 6.
  await expect(result).toHaveText('You entered: 6');
});

// ---------------------------------------------------------------------------
// STEP 5 | Slide tip: "Do not overuse keyboard.type for normal fields;
// fill is faster and more reliable for input state"
// ---------------------------------------------------------------------------
test('STEP 5: timing, fill vs typing for a normal field', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  const username = page.getByLabel('Username');
  const text = 'a-normal-long-username-value';

  // 5a. Typing key by key with a delay is slow: text.length x 50 ms.
  let t = Date.now();
  await username.pressSequentially(text, { delay: 50 });
  console.log(`pressSequentially took ${Date.now() - t} ms`);

  // 5b. fill() does the same job almost instantly and gives a clean value.
  await username.clear();
  t = Date.now();
  await username.fill(text);
  console.log(`fill took ${Date.now() - t} ms`);

  await expect(username).toHaveValue(text);
});
