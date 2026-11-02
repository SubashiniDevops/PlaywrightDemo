// drag-drop.spec.ts
// Slide: "Drag & drop: simple first, manual when needed"
// Real practice site: https://the-internet.herokuapp.com
//
// SETUP (once):
//   npm i -D @playwright/test && npx playwright install chromium
// RUN:
//   npx playwright test drag-drop.spec.ts --headed --workers=1
//   One step: npx playwright test -g "STEP 1" --headed

import { test, expect } from '@playwright/test';

const BASE = 'https://the-internet.herokuapp.com';

// ---------------------------------------------------------------------------
// STEP 1 | Slide code box "dragTo": high-level drag and drop
// Use locator.dragTo() first. It works for standard HTML5 drag and drop.
// Page: /drag_and_drop (two boxes, A and B; drag A onto B to swap them)
// ---------------------------------------------------------------------------
test('STEP 1: dragTo, drag box A onto box B', async ({ page }) => {
  await page.goto(`${BASE}/drag_and_drop`);

  // 1a. Define the source (what we pick up) and the target (where we drop).
  //     No await: locators only describe elements.
  const source = page.locator('#column-a');
  const target = page.locator('#column-b');

  // 1b. Check the starting state so the class sees the "before".
  await expect(source.locator('header')).toHaveText('A');
  await expect(target.locator('header')).toHaveText('B');

  // 1c. One line does the whole gesture: hover the source, press the mouse
  //     button, move to the target, release. Playwright also waits for both
  //     elements to be visible and stable first (auto-wait).
  await source.dragTo(target);

  // 1d. Slide tip: assert the FINAL STATE, not that a mouse event fired.
  //     After the drop, the boxes have swapped places.
  await expect(source.locator('header')).toHaveText('B');
  await expect(target.locator('header')).toHaveText('A');
});

// ---------------------------------------------------------------------------
// STEP 2 | Slide code box "manual mouse"
// When dragTo is not enough (sliders, canvas, custom widgets that need
// precise movement), drive the mouse yourself:
// hover, mouse.down, mouse.move, mouse.up.
// Page: /horizontal_slider (range input from 0 to 5, shown in a label)
// ---------------------------------------------------------------------------
test('STEP 2: manual mouse, drag a slider to the right end', async ({ page }) => {
  await page.goto(`${BASE}/horizontal_slider`);

  const slider = page.getByRole('slider');
  const value = page.locator('#range');
  await expect(value).toHaveText('0');

  // 2a. Find where the slider is on screen. boundingBox() gives x, y, width
  //     and height in pixels, so we do not have to guess coordinates
  //     (the slide uses fixed numbers like 600, 320).
  const box = await slider.boundingBox();
  if (!box) throw new Error('Slider is not visible');
  const y = box.y + box.height / 2;               // vertical middle
  const endX = box.x + box.width - 1;             // right end of the track

  // 2b. Move the mouse onto the slider (slide: hover on the thumb).
  await slider.hover();

  // 2c. Press and hold the left mouse button.
  await page.mouse.down();

  // 2d. Move in several steps. The slide notes that some handlers need
  //     MORE THAN ONE mouse move: one big jump can skip the events the
  //     widget listens to. steps: 10 splits the move into 10 small moves.
  await page.mouse.move(endX, y, { steps: 10 });

  // 2e. Release the button. The drag is now finished.
  await page.mouse.up();

  // 2f. Assert the final value, not the mouse events.
  await expect(value).toHaveText('5');
});

// ---------------------------------------------------------------------------
// STEP 3 | Same result with the keyboard (bonus: simplest option for sliders)
// If the widget supports it, keyboard input is often more reliable than mouse.
// ---------------------------------------------------------------------------
test('STEP 3: bonus, set the slider with the keyboard', async ({ page }) => {
  await page.goto(`${BASE}/horizontal_slider`);

  // 3a. Focus the slider, then press the right arrow key.
  //     Each press moves the value by one step (0.5 on this page).
  await page.getByRole('slider').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');

  // 3b. Two steps of 0.5 give 1.
  await expect(page.locator('#range')).toHaveText('1');
});
