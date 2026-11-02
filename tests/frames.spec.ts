// frames.spec.ts
// Slide: "Frames / iFrames: enter the frame, then locate"
// Real practice site: https://the-internet.herokuapp.com
//
// SETUP (once):
//   npm i -D @playwright/test && npx playwright install chromium
//   (contentFrame() needs Playwright 1.43 or newer: npx playwright --version)
// RUN:
//   npx playwright test frames.spec.ts --headed --workers=1
//   One step: npx playwright test -g "STEP 1" --headed

import { test, expect } from '@playwright/test';

const BASE = 'https://the-internet.herokuapp.com';

// ---------------------------------------------------------------------------
// STEP 0 | Why frames need special handling
// An iframe is a separate web page embedded inside your page.
// page.locator() searches only the MAIN page, not inside iframes.
// ---------------------------------------------------------------------------
test('STEP 0: gotcha, page.locator cannot see inside an iframe', async ({ page }) => {
  await page.goto(`${BASE}/iframe`);

  // 0a. The editor text area (#tinymce) lives INSIDE the iframe.
  //     Searching from the main page finds nothing.
  await expect(page.locator('#tinymce')).toHaveCount(0);

  // 0b. The iframe element itself IS in the main page, so this works.
  await expect(page.locator('iframe#mce_0_ifr')).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// STEP 1 | Slide code box "FrameLocator"
// page.frameLocator(selector) = "step inside this iframe".
// After that, use locators as usual: they chain naturally.
// ---------------------------------------------------------------------------
test('STEP 1: frameLocator, enter the frame then locate', async ({ page }) => {
  await page.goto(`${BASE}/iframe`);

  // 1a. Point at the iframe element using a CSS selector for the <iframe> tag.
  //     No await: this only describes the frame, like any locator.
  const frame = page.frameLocator('iframe#mce_0_ifr');

  // 1b. Locate the editor body INSIDE the frame. Slide uses getByLabel and
  //     getByRole here. This page has no labels, so we use the element id.
  const editor = frame.locator('#tinymce');

  // 1c. fill() auto-waits, just like on the main page. Clear old text first.
  await editor.clear();
  await editor.fill('Typed inside an iframe with frameLocator');

  // 1d. Web-first assertion on the frame content.
  await expect(editor).toHaveText('Typed inside an iframe with frameLocator');

  // 1e. Leaving the frame needs no extra step: "page" still points at the
  //     main page, so main-page locators keep working.
  await expect(page.getByRole('heading', { name: /An iFrame containing/ })).toBeVisible();
});

// ---------------------------------------------------------------------------
// STEP 2 | Slide code box "contentFrame"
// Use when you ALREADY have a locator pointing at the <iframe> element.
// iframe locator -> .contentFrame() -> frame locator
// ---------------------------------------------------------------------------
test('STEP 2: contentFrame, convert an iframe locator into a frame locator', async ({ page }) => {
  await page.goto(`${BASE}/iframe`);

  // 2a. A normal locator that points at the <iframe> element.
  const iframe = page.locator('iframe#mce_0_ifr');

  // 2b. contentFrame() = "now look INSIDE that iframe".
  //     Same result as frameLocator, but starts from a locator you already
  //     have (for example one you found by filtering or chaining).
  const editorFrame = iframe.contentFrame();

  // 2c. Locate and fill inside the frame as usual.
  const editor = editorFrame.locator('#tinymce');
  await editor.clear();
  await editor.fill('Release notes');
  await expect(editor).toHaveText('Release notes');
});

// ---------------------------------------------------------------------------
// STEP 3 | Same principles, nested frames
// Chain frameLocator calls to go deeper: frame inside frame.
// Page: /nested_frames (a top frame holding left / middle / right frames)
// ---------------------------------------------------------------------------
test('STEP 3: nested frames, chain frameLocator', async ({ page }) => {
  await page.goto(`${BASE}/nested_frames`);

  // 3a. Enter the top frame.
  const top = page.frameLocator('frame[name="frame-top"]');

  // 3b. From inside the top frame, enter the middle frame.
  const middle = top.frameLocator('frame[name="frame-middle"]');

  // 3c. Locate and assert inside the middle frame.
  await expect(middle.locator('#content')).toHaveText('MIDDLE');

  // 3d. Sibling frames are reached from the same parent.
  await expect(top.frameLocator('frame[name="frame-left"]').locator('body')).toContainText('LEFT');

  // 3e. The bottom frame is a direct child of the main page.
  await expect(page.frameLocator('frame[name="frame-bottom"]').locator('body')).toContainText('BOTTOM');
});
