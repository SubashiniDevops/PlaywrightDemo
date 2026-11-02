// mouse-actions.spec.ts
// Slide: "Mouse actions: hover, click positions, wheel"
// Real practice sites: https://the-internet.herokuapp.com and jQuery UI demos
//
// SETUP (once):
//   npm i -D @playwright/test && npx playwright install chromium
// RUN:
//   npx playwright test mouse-actions.spec.ts --headed --workers=1
//   One step: npx playwright test -g "STEP 1" --headed

import { test, expect } from '@playwright/test';

const BASE = 'https://the-internet.herokuapp.com';

// ---------------------------------------------------------------------------
// STEP 1 | Card 1 "Hover menus": use locator.hover(), then assert visibility
// Page: /hovers (three user pictures; the caption appears only on hover)
// ---------------------------------------------------------------------------
test('STEP 1: hover reveals hidden content', async ({ page }) => {
  await page.goto(`${BASE}/hovers`);

  // 1a. The first user card, and the caption inside it.
  //     Locators only describe elements, so no await here.
  const card = page.locator('.figure').first();
  const caption = card.getByText('name: user1');

  // 1b. Before hovering, the caption exists in the page but is hidden.
  await expect(caption).toBeHidden();

  // 1c. hover() moves the mouse onto the center of the card.
  //     Like every action, it waits until the element is visible and stable.
  await card.hover();

  // 1d. Slide rule: after hover, ASSERT the menu is visible.
  //     expect() retries, so it passes as soon as the caption appears.
  await expect(caption).toBeVisible();
  await expect(card.getByRole('link', { name: 'View profile' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// STEP 2 | Card 1 again, the slide's code: hover a button, then click an item
// Page: jQuery UI menu demo (menus open on hover and nest two levels deep)
// ---------------------------------------------------------------------------
test('STEP 2: hover menu, then click an item inside it', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/jqueryui/menu');

  // 2a. Hover the top-level item. Slide equivalent: hover 'Account'.
  await page.getByText('Enabled', { exact: true }).hover();

  // 2b. Assert the next level opened BEFORE moving on (slide line 3).
  const downloads = page.getByText('Downloads', { exact: true });
  await expect(downloads).toBeVisible();

  // 2c. Move to the second level to open the sub-menu, then assert again.
  await downloads.hover();
  const pdf = page.getByText('PDF', { exact: true });
  await expect(pdf).toBeVisible();

  // 2d. Click the final item. Slide equivalent: click 'Settings'.
  //     This item starts a file download, so listen for it first
  //     (listener before trigger, from the download slide).
  const downloadPromise = page.waitForEvent('download');
  await pdf.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('menu');
});

// ---------------------------------------------------------------------------
// STEP 3 | Card 2 "Coordinates": use only when no DOM target exists
// Page: /context_menu (a box; right-click inside it shows a JS alert)
// click({ position }) = x and y in pixels, measured from the element's
// TOP-LEFT corner, not from the page.
// ---------------------------------------------------------------------------
test('STEP 3: click at a position inside an element', async ({ page }) => {
  await page.goto(`${BASE}/context_menu`);

  // 3a. Listen for the alert BEFORE the click (rule from the popups slide).
  let message = '';
  page.once('dialog', async (dialog) => {
    message = dialog.message();
    await dialog.accept();
  });

  // 3b. Right-click 50 px from the left and 50 px from the top of the box.
  //     Slide: click({ position: { x: 180, y: 120 } }) on a canvas.
  await page.locator('#hot-spot').click({
    button: 'right',
    position: { x: 50, y: 50 },
  });

  // 3c. Assert the final result, not the coordinates.
  expect(message).toBe('You selected a context menu');

  // 3d. Prefer a normal locator whenever one exists. Coordinates break when
  //     the layout, window size or zoom changes.
});

// ---------------------------------------------------------------------------
// STEP 4 | Card 3 "Scroll": mouse.wheel() after hovering the scroll area
// Page: /infinite_scroll (more paragraphs load as you scroll to the bottom)
// mouse.wheel(deltaX, deltaY): positive deltaY scrolls DOWN.
// ---------------------------------------------------------------------------
test.only('STEP 4: scroll with the mouse wheel', async ({ page }) => {
  await page.goto(`${BASE}/infinite_scroll`);

  // 4a. Count the paragraphs loaded at the start.
  const paragraphs = page.locator('.jscroll-added');
  const before = await paragraphs.count();
  console.log("paragraph count:",before);
  console.log("paragraph count:",paragraphs.count());


  // 4b. Hover first: the wheel scrolls whatever is under the mouse pointer.
  //     Slide: hover 'virtual-list' so the wheel goes to that container.
  await page.locator('.jscroll-inner').hover();

  // 4c. Scroll down 2000 pixels in one go. Slide uses (0, 900).
  await page.mouse.wheel(0, 2000);

  // 4d. Assert the final state: new content loaded.
  //     expect.poll() retries a plain value until the condition passes.
  await expect.poll(async () => 
    paragraphs.count()).toBeGreaterThan(before);
});
