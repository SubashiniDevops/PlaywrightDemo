// Playwright (JavaScript): retrying expectations
// Fully offline: a tiny local server (started inside this file) serves a dashboard page and a jobs API.

// Import Playwright's `test` (defines tests and hooks) and `expect` (assertions)
const { test, expect } = require('@playwright/test');
// Node's built-in HTTP module, used to start a tiny local web server
const http = require('http');

// Holds the server object so we can close it later
let server;
// Holds the server URL (e.g. http://localhost:54321)
let baseURL;
// Counts how many times the jobs API has been called
let jobCalls = 0;

// The dashboard page stored as a string; the server returns it for /dashboard
const dashboardHtml = `<!DOCTYPE html>
<html>
<head><title>Dashboard - Demo</title></head>
<body>
  <h1>Dashboard</h1>
  <button id="save">Save</button>
  <div id="alert-area"></div>

  <ul id="items"></ul>

  <p>Total: <span data-testid="total">$42.00</span></p>
  <p>Tax: <span data-testid="tax">$2.00</span></p>

  <script>
    // Alert appears 1 second after clicking Save
    document.getElementById('save').onclick = () => setTimeout(() => {
      const a = document.createElement('div');
      a.setAttribute('role', 'alert');
      a.textContent = 'Saved successfully';
      document.getElementById('alert-area').appendChild(a);
    }, 1000);

    // List items are added one by one, 500 ms apart
    let n = 0;
    const t = setInterval(() => {
      const li = document.createElement('li');
      li.textContent = 'Item ' + (++n);
      document.getElementById('items').appendChild(li);
      if (n === 3) clearInterval(t);
    }, 500);
  </script>
</body>
</html>`;

// Hook: runs ONCE before all tests in this file
test.beforeAll(async () => {
  // Create a server; the callback runs for every request (req = request, res = response)
  server = http.createServer((req, res) => {
    // If the browser asks for /dashboard...
    if (req.url === '/dashboard') {
      // ...reply 200 OK and say the content is HTML
      res.writeHead(200, { 'Content-Type': 'text/html' });
      // ...send the dashboard page
      res.end(dashboardHtml);
    // Otherwise, if the fake jobs API is requested...
    } else if (req.url === '/api/jobs/123') {
      // Count this call
      jobCalls += 1;
      // Job reports "running" for the first 3 calls, then "done"
      // Reply 200 OK and say the content is JSON
      res.writeHead(200, { 'Content-Type': 'application/json' });
      // Calls 1-3 return "running"; the 4th onward returns "done"
      res.end(JSON.stringify({ status: jobCalls >= 4 ? 'done' : 'running' }));
    // Anything else...
    } else {
      // ...gets a 404 Not Found
      res.writeHead(404);
      res.end('Not found');
    }
  });
  // Start listening on port 0 (the OS picks a free port); the Promise lets `await` wait until it's ready
  await new Promise((resolve) => server.listen(0, resolve));
  // Read the chosen port and build the base URL
  baseURL = `http://localhost:${server.address().port}`;
});

// Hook: runs ONCE after all tests; shuts the server down
test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

// Hook: runs before EVERY test; resets the counter so tests don't affect each other
test.beforeEach(() => {
  jobCalls = 0;
});

// 1. Web-first assertions: they retry until true or the assertion timeout
// `{ page }` is a fresh browser page that Playwright provides for each test
test('web-first: title, alert text and list count', async ({ page }) => {
  // Open the dashboard
  await page.goto(`${baseURL}/dashboard`);

  // Check the title matches the regex; retries until it passes or times out (default 5 s)
  await expect(page).toHaveTitle(/Dashboard/);

  // Find the button by its accessible role and name, then click it
  await page.getByRole('button', { name: 'Save' }).click();
  // Waits (retrying) for the alert to contain "Saved"
  await expect(page.getByRole('alert')).toContainText('Saved'); // appears after ~1 s

  // Waits until exactly 3 <li> elements exist
  await expect(page.getByRole('listitem')).toHaveCount(3); // items arrive over ~1.5 s
});

// 2. Soft assertions: failures are collected and the test keeps running
test('soft checks: validate several values on a summary page', async ({ page }) => {
  await page.goto(`${baseURL}/dashboard`);

  // getByTestId finds elements by data-testid; expect.soft records a failure but doesn't stop the test
  await expect.soft(page.getByTestId('total')).toHaveText('$42.00');
  await expect.soft(page.getByTestId('tax')).toHaveText('$2.00');

  // Optional: stop early if any soft check has already failed
  // (errors is non-empty if a soft check failed, so this hard assertion would stop the test)
  expect(test.info().errors).toHaveLength(0);
});

// 3. Soft assertions with failures: this test is EXPECTED to fail (test.fail),
//    to show that both wrong values are reported, not just the first one.
test('soft checks: collects multiple failures', async ({ page }) => {
  // Marks the test as expected to fail; it passes only if the body fails
  test.fail(); // passes only if the test body fails
  await page.goto(`${baseURL}/dashboard`);

  // Both values are wrong on purpose; the 2nd argument is a custom message for the report;
  // timeout: 1000 shortens the retry wait to 1 s
  await expect.soft(page.getByTestId('total'), 'wrong total').toHaveText('$99.00', { timeout: 1000 });
  await expect.soft(page.getByTestId('tax'), 'wrong tax').toHaveText('$9.00', { timeout: 1000 });
  // Both failures show up in the report; the test continues to this line.
});

// 4. AVOID: an immediate check such as isVisible() does not retry
test('avoid: isVisible() inside plain expect is flaky', async ({ page }) => {
  // Expected to fail: the alert is not there yet at the moment of the check
  test.fail(); // expected to fail: the alert is not there yet at the moment of the check
  await page.goto(`${baseURL}/dashboard`);
  await page.getByRole('button', { name: 'Save' }).click();

  // BAD: evaluated once, immediately, while the alert appears after 1 s
  // isVisible() checks only once and returns false here, so the test fails
  expect(await page.getByRole('alert').isVisible()).toBe(true);
});

// 5. The right way for the same check
test('right way: toBeVisible() retries', async ({ page }) => {
  await page.goto(`${baseURL}/dashboard`);
  await page.getByRole('button', { name: 'Save' }).click();

  // Same check, but toBeVisible() retries until the alert appears, so it passes
  await expect(page.getByRole('alert')).toBeVisible();
});

// 6. expect.poll: retry non-DOM state, such as an API response
test('expect.poll: wait for a job to finish via API', async ({ page }) => {
  // expect.poll repeatedly runs the function below until its result equals 'done'
  await expect
    .poll(
      async () => {
        // Make an HTTP request using Playwright's API client
        const res = await page.request.get(`${baseURL}/api/jobs/123`);
        // Return "running" or "done" from the JSON body
        return (await res.json()).status;
      },
      // timeout: give up after 30 s (_ is just a readability separator); intervals: wait 500 ms between attempts
      { timeout: 30_000, intervals: [500] }
    )
    .toBe('done');

  // Confirms the server was called at least 4 times, proving it polled until the status flipped
  expect(jobCalls).toBeGreaterThanOrEqual(4); // it really polled until the status changed
});