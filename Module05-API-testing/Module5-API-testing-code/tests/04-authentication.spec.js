const { test, expect, request } = require('@playwright/test');

/**
 * TOPIC: Authentication (Basic, Bearer token, API key, cookies/session)
 * Sample API: https://httpbin.org  (has endpoints that require credentials)
 */
test.use({ baseURL: 'https://httpbin.org' });

test.describe('Basic authentication', () => {
  test('valid credentials -> 200', async ({ request }) => {
    const credentials = Buffer.from('qa-user:s3cret').toString('base64');

    const response = await request.get('/basic-auth/qa-user/s3cret', {
      headers: { Authorization: `Basic ${credentials}` },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ authenticated: true, user: 'qa-user' });
  });

  test('wrong password -> 401', async ({ request }) => {
    const credentials = Buffer.from('qa-user:wrong').toString('base64');
    const response = await request.get('/basic-auth/qa-user/s3cret', {
      headers: { Authorization: `Basic ${credentials}` },
    });
    expect(response.status()).toBe(401);
  });

  test('httpCredentials: let Playwright add the header', async () => {
    const api = await request.newContext({
      baseURL: 'https://httpbin.org',
      httpCredentials: { username: 'qa-user', password: 's3cret', send: 'always' },
    });
    const response = await api.get('/basic-auth/qa-user/s3cret');
    expect(response.status()).toBe(200);
    await api.dispose();
  });
});

test.describe('Bearer token', () => {
  test('token accepted -> 200', async ({ request }) => {
    const response = await request.get('/bearer', {
      headers: { Authorization: 'Bearer my-test-token' },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ authenticated: true, token: 'my-test-token' });
  });

  test('missing token -> 401', async ({ request }) => {
    const response = await request.get('/bearer');
    expect(response.status()).toBe(401);
  });
});

test.describe('API key', () => {
  test('API key in a header', async ({ request }) => {
    const { headers } = await (await request.get('/headers', { headers: { 'X-API-Key': 'key-123' } })).json();
    expect(headers['X-Api-Key']).toBe('key-123');
  });

  test('API key in the query string', async ({ request }) => {
    const { args } = await (await request.get('/get', { params: { api_key: 'key-123' } })).json();
    expect(args.api_key).toBe('key-123');
  });
});

test.describe('cookie / session', () => {
  test('cookies persist inside one request context', async ({ request }) => {
    await request.get('/cookies/set?session=abc123');          // server sets the cookie (follows redirect)
    const { cookies } = await (await request.get('/cookies')).json();
    expect(cookies).toEqual({ session: 'abc123' });

    const state = await request.storageState();                // export cookies for reuse
    expect(state.cookies.map((c) => c.name)).toContain('session');
  });
});
