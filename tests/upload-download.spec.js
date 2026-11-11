// Slide 19: File upload and download, synchronize with events
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE = 'https://the-internet.herokuapp.com';

// Card 1: Upload. setInputFiles() targets input[type=file] directly.
test('upload: setInputFiles', async ({ page }) => {
  await page.goto(`${BASE}/upload`);

  await page.locator('#file-upload')
    .setInputFiles(path.join(__dirname, 'fixtures/resume.pdf'));
  await page.locator('#file-submit').click();

  await expect(page.getByRole('heading', { name: 'File Uploaded!' })).toBeVisible();
  await expect(page.getByText('resume.pdf')).toBeVisible();
});

// Card 2: Chooser. Use waitForEvent('filechooser') when the input is hidden behind a button.
// On this page the drag-and-drop box opens the chooser when clicked.
test('chooser: waitForEvent filechooser', async ({ page }) => {
  await page.goto(`${BASE}/upload`);

  const chooserPromise = page.waitForEvent('filechooser');
  await page.locator('#drag-drop-upload').click();
  const chooser = await chooserPromise;
  await chooser.setFiles(path.join(__dirname, 'fixtures/resume.pdf'));

  await expect(page.locator('#drag-drop-upload')).toContainText('resume.pdf');
});

// Card 3: Download. Create the download promise before clicking the link.
test('download: promise before click', async ({ page }) => {
  await page.goto(`${BASE}/download`);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('.example a').first().click();
  const download = await downloadPromise;

  console.log('Downloaded:', download.suggestedFilename());
  await download.saveAs('downloads/' + download.suggestedFilename());

  expect(fs.existsSync('downloads/' + download.suggestedFilename())).toBe(true);
});
