const { test, expect, request } = require('@playwright/test');
const { startMockOAuthServer } = require('../helpers/mock-oauth-server');

/**
 * TOPIC: OAuth 2.0
 * Runs against a local mock provider (helpers/mock-oauth-server.js), so it needs no real
 * identity provider. The calls are exactly what you would send to Okta/Azure AD/Auth0:
 *   1) POST /oauth/token  (grant_type=client_credentials)  -> access_token
 *   2) call the API with  Authorization: Bearer <access_token>
 *   3) POST /oauth/token  (grant_type=refresh_token)       -> a new access_token
 */
test.describe('OAuth 2.0 client credentials', () => {
  let oauth;
  let api;

  test.beforeAll(async () => {
    oauth = await startMockOAuthServer();
    api = await request.newContext({ baseURL: oauth.url });
  });

  test.afterAll(async () => {
    await api.dispose();
    await oauth.close();
  });

  async function getToken(scope) {
    const response = await api.post('/oauth/token', {
      form: {                                              // token endpoints expect form encoding
        grant_type: 'client_credentials',
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        ...(scope && { scope }),
      },
    });
    expect(response.status()).toBe(200);
    return response.json();
  }

  test('request an access token', async () => {
    const token = await getToken();

    expect(token).toMatchObject({ token_type: 'Bearer', expires_in: 3600 });
    expect(token.access_token).toMatch(/^[a-f0-9]{32}$/);
  });

  test('use the access token on a protected API', async () => {
    const { access_token } = await getToken();

    const response = await api.get('/api/orders', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toHaveLength(2);
  });

  test('no token -> 401 with WWW-Authenticate header', async () => {
    const response = await api.get('/api/orders');
    expect(response.status()).toBe(401);
    expect(response.headers()['www-authenticate']).toContain('Bearer');
  });

  test('wrong client secret -> 401 invalid_client', async () => {
    const response = await api.post('/oauth/token', {
      form: { grant_type: 'client_credentials', client_id: oauth.clientId, client_secret: 'nope' },
    });
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: 'invalid_client' });
  });

  test('token endpoint also accepts HTTP Basic client authentication', async () => {
    const basic = Buffer.from(`${oauth.clientId}:${oauth.clientSecret}`).toString('base64');
    const response = await api.post('/oauth/token', {
      headers: { Authorization: `Basic ${basic}` },
      form: { grant_type: 'client_credentials' },
    });
    expect(response.status()).toBe(200);
  });

  test('insufficient scope -> 403', async () => {
    const { access_token } = await getToken('profile:read');
    const response = await api.get('/api/orders', { headers: { Authorization: `Bearer ${access_token}` } });
    expect(response.status()).toBe(403);
  });

  test('refresh an access token', async () => {
    const first = await getToken();

    const response = await api.post('/oauth/token', {
      form: {
        grant_type: 'refresh_token',
        refresh_token: first.refresh_token,
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
      },
    });

    expect(response.status()).toBe(200);
    const refreshed = await response.json();
    expect(refreshed.access_token).not.toBe(first.access_token);   // a brand-new token
  });
});
