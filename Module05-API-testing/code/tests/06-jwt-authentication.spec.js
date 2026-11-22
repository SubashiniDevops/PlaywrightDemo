const { test, expect } = require('@playwright/test');

/**
 * TOPIC: JWT authentication
 * Sample API: https://dummyjson.com  (login returns a real signed JWT)
 * A JWT is three base64url parts:  header.payload.signature
 */
test.use({ baseURL: 'https://dummyjson.com' });

const decodePart = (jwt, index) =>
  JSON.parse(Buffer.from(jwt.split('.')[index], 'base64url').toString('utf8'));

async function login(request) {
  const response = await request.post('/auth/login', {
    data: { username: 'emilys', password: 'emilyspass', expiresInMins: 30 },
  });
  expect(response.status()).toBe(200);
  return response.json();
}

test('login returns an access token and a refresh token', async ({ request }) => {
  const session = await login(request);

  expect(session.accessToken.split('.')).toHaveLength(3);        // header.payload.signature
  expect(session.refreshToken).toBeTruthy();
  expect(session.username).toBe('emilys');
});

test('decode the JWT and assert its claims', async ({ request }) => {
  const { accessToken } = await login(request);

  const header = decodePart(accessToken, 0);
  const payload = decodePart(accessToken, 1);

  expect(header).toMatchObject({ alg: 'HS256', typ: 'JWT' });
  expect(payload.username).toBe('emilys');
  expect(payload.exp).toBeGreaterThan(Date.now() / 1000);         // not expired
  expect(payload.exp - payload.iat).toBe(30 * 60);                // 30 minutes lifetime
});

test('send the JWT as a Bearer token to a protected endpoint', async ({ request }) => {
  const { accessToken } = await login(request);

  const response = await request.get('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ username: 'emilys', firstName: 'Emily' });
});

test('missing or tampered token is rejected', async ({ request }) => {
  const noToken = await request.get('/auth/me');
  expect(noToken.status()).toBe(401);

  const { accessToken } = await login(request);
  const tampered = accessToken.slice(0, -4) + 'AAAA';              // break the signature
  const bad = await request.get('/auth/me', { headers: { Authorization: `Bearer ${tampered}` } });
  expect(bad.ok()).toBe(false);                                    // this demo API answers 500 here; a strict API returns 401
});

test('refresh the access token with the refresh token', async ({ request }) => {
  const { refreshToken } = await login(request);

  const response = await request.post('/auth/refresh', {
    data: { refreshToken, expiresInMins: 30 },
  });

  expect(response.status()).toBe(200);
  const refreshed = await response.json();
  expect(refreshed.accessToken).toBeTruthy();
  expect(refreshed.accessToken.split('.')).toHaveLength(3);
});

test('reusable authenticated context (login once, call many)', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: 'https://dummyjson.com' });
  const { accessToken } = await login(anon);

  const authed = await playwright.request.newContext({
    baseURL: 'https://dummyjson.com',
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },  // every call is authenticated
  });

  expect((await authed.get('/auth/me')).status()).toBe(200);
  expect((await authed.get('/auth/me')).ok()).toBe(true);

  await anon.dispose();
  await authed.dispose();
});
