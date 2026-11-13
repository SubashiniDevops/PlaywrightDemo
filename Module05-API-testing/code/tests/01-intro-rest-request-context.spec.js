const { test, expect, request } = require('@playwright/test');

/**
 * TOPICS: Introduction to API testing, REST API testing, Playwright request context
 * Sample API: https://jsonplaceholder.typicode.com  (free fake REST API)
 *
 * API testing = send HTTP requests directly and assert on status, headers and body.
 * No browser, no UI: faster and more stable than UI tests.
 */

// --- 1. The built-in `request` fixture (an APIRequestContext) -------------------------
test('request fixture: baseURL comes from playwright.config.js', async ({ request }) => {
  const response = await request.get('/posts/1');   // -> https://jsonplaceholder.typicode.com/posts/1
  console.log("Request Payload", { method: 'GET', url: response.url() });
  console.log("Response : ", response);
  console.log("Response JSON : ", await response.json());
  expect(response.ok()).toBeTruthy();               // true for any 2xx status
  expect(response.status()).toBe(200);
  expect(response.statusText()).toBe('OK');
});

// --- 2. Override the context for a whole file with test.use() ------------------------
test.describe('custom context options', () => {
  test.use({
    baseURL: 'https://httpbin.org',
    extraHTTPHeaders: { 'X-Course': 'playwright-module-5' },
  });

  test('extraHTTPHeaders are sent on every request', async ({ request }) => {
    const body = await (await request.get('/headers')).json();
    expect(body.headers['X-Course']).toBe('playwright-module-5');
  });
});

// --- 3. Create your own context with request.newContext() ----------------------------
test('standalone request context (good for beforeAll / global setup)', async () => {
  const api = await request.newContext({
    baseURL: 'https://jsonplaceholder.typicode.com',
    timeout: 10_000,
  });

  const response = await api.get('/users/1');
  expect(response.status()).toBe(200);
  expect((await response.json()).username).toBe('Bret');

  await api.dispose();                              // always release the context
});

// --- 4. REST principles in practice: resources + verbs + status codes ---------------
test('REST: a resource URL, a verb, and a meaningful status code', async ({ request }) => {
  // GET /posts        -> collection, 200
  const list = await request.get('/posts');
  expect(list.status()).toBe(200);
  expect(Array.isArray(await list.json())).toBe(true);

  // GET /posts/{id}   -> single resource, 200 (or 404 when it does not exist)
  expect((await request.get('/posts/1')).status()).toBe(200);
  expect((await request.get('/posts/999999')).status()).toBe(404);
});

// --- 5. Browser + API in one test: share cookies/storage via page.request ------------
test('page.request shares the browser context (UI + API together)', async ({ page }) => {
  const response = await page.request.get('https://jsonplaceholder.typicode.com/todos/1');
  expect(response.ok()).toBeTruthy();
});
