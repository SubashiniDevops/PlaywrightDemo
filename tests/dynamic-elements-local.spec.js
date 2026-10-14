// Playwright practice: dynamic elements, fully offline (no external URL needed).
// Each test builds its own page with page.setContent().
const { test, expect } = require('@playwright/test');

// 1. Element appears after a delay
test('element appears after delay', async ({ page }) => {
  await page.setContent(`
    <button id="start">Start</button>
    <div id="result" style="display:none">Hello World!</div>
    <script>
      document.getElementById('start').onclick = () =>
        setTimeout(() => document.getElementById('result').style.display = 'block', 1500);
    </script>`);
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#result')).toHaveText('Hello World!');
});

// 2. Element added to the DOM later
test('element added to DOM after click', async ({ page }) => {
  await page.setContent(`
    <button id="add">Add item</button>
    <ul id="list"></ul>
    <script>
      document.getElementById('add').onclick = () => setTimeout(() => {
        const li = document.createElement('li');
        li.textContent = 'New item';
        document.getElementById('list').appendChild(li);
      }, 1000);
    </script>`);
  await expect(page.locator('li')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add item' }).click();
  await expect(page.locator('li')).toHaveCount(1);
  await expect(page.locator('li')).toHaveText('New item');
});

// 3. Element removed from the DOM
test('element removed from DOM', async ({ page }) => {
  await page.setContent(`
    <input type="checkbox" id="box"><button id="remove">Remove</button>
    <script>
      document.getElementById('remove').onclick = () =>
        setTimeout(() => document.getElementById('box').remove(), 1000);
    </script>`);
  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.locator('#box')).toHaveCount(0);
});

// 4. Disabled input becomes enabled
test('input becomes enabled', async ({ page }) => {
  await page.setContent(`
    <input id="name" disabled><button id="enable">Enable</button>
    <script>
      document.getElementById('enable').onclick = () =>
        setTimeout(() => document.getElementById('name').disabled = false, 1000);
    </script>`);
  const input = page.locator('#name');
  await expect(input).toBeDisabled();
  await page.getByRole('button', { name: 'Enable' }).click();
  await expect(input).toBeEnabled();
  await input.fill('Playwright');
  await expect(input).toHaveValue('Playwright');
});

// 5. Dynamic id: stable locators instead of changing ids
test('locate element with a dynamic id', async ({ page }) => {
  await page.setContent(`
    <button id="">Submit</button>
    <script>
      document.querySelector('button').id = 'btn_' + Math.floor(Math.random() * 100000);
    </script>`);
  // Do not use the id. Use role/text, or a prefix match.
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  await expect(page.locator('button[id^="btn_"]')).toHaveCount(1);
});

// 6. Table rows loaded later: find by content, not position
test('table rows loaded later', async ({ page }) => {
  await page.setContent(`
    <button id="load">Load</button>
    <table><tbody id="rows"></tbody></table>
    <script>
      document.getElementById('load').onclick = () => setTimeout(() => {
        document.getElementById('rows').innerHTML =
          '<tr><td>Asha</td><td>QA</td></tr><tr><td>Ravi</td><td>Dev</td></tr>';
      }, 1000);
    </script>`);
  await page.getByRole('button', { name: 'Load' }).click();
  const row = page.locator('tbody tr', { hasText: 'Ravi' });
  await expect(row).toBeVisible();
  await expect(row.locator('td').nth(1)).toHaveText('Dev');
});

// 7. Dropdown whose options load later
test('dropdown options load later', async ({ page }) => {
  await page.setContent(`
    <select id="city"><option>Loading...</option></select>
    <script>
      setTimeout(() => {
        document.getElementById('city').innerHTML =
          '<option>Chennai</option><option>Bengaluru</option>';
      }, 1000);
    </script>`);
  const city = page.locator('#city');
  await expect(city.locator('option')).toHaveCount(2);
  await city.selectOption('Bengaluru');
  await expect(city).toHaveValue('Bengaluru');
});

// 8. Alert dialog appearing after a click
test('handle a JavaScript alert', async ({ page }) => {
  await page.setContent(`
    <button onclick="setTimeout(() => alert('Saved!'), 500)">Save</button>`);
  const dialogPromise = page.waitForEvent('dialog');
  await page.getByRole('button', { name: 'Save' }).click();
  const dialog = await dialogPromise;
  expect(dialog.message()).toBe('Saved!');
  await dialog.accept();
});

// 9. Value that changes over time: expect.poll
test('poll a changing counter', async ({ page }) => {
  await page.setContent(`
    <div id="count">0</div>
    <script>
      let n = 0;
      setInterval(() => { document.getElementById('count').textContent = ++n; }, 300);
    </script>`);
  await expect
    .poll(async () => Number(await page.locator('#count').textContent()))
    .toBeGreaterThanOrEqual(3);
});

// 10. Loader disappears, then content shows
test('wait for loader to disappear', async ({ page }) => {
  await page.setContent(`
    <div id="loader">Loading...</div>
    <div id="content" style="display:none">Data ready</div>
    <script>
      setTimeout(() => {
        document.getElementById('loader').remove();
        document.getElementById('content').style.display = 'block';
      }, 1500);
    </script>`);
  await expect(page.locator('#loader')).toBeHidden();
  await expect(page.locator('#content')).toHaveText('Data ready');
});
