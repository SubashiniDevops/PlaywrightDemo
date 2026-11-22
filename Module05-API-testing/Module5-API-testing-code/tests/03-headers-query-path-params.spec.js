const { test, expect } = require('@playwright/test');

/**
 * TOPICS: Request headers, Query parameters, Path parameters
 * Sample APIs: https://httpbin.org (echoes what it receives) and https://jsonplaceholder.typicode.com
 */

test.describe('request headers', () => {
  test.use({ baseURL: 'https://httpbin.org' });

  test('send custom headers on one request', async ({ request }) => {
    const response = await request.get('/headers', {
      headers: {
        'X-Trace-Token': 'abc-123',
        'Accept-Language': 'en-IN',
        'User-Agent': 'playwright-api-training',
      },
    });

    const { headers } = await response.json();     // httpbin echoes the headers it saw
    expect(headers['X-Trace-Token']).toBe('abc-123');
    expect(headers['Accept-Language']).toBe('en-IN');
    expect(headers['User-Agent']).toBe('playwright-api-training');
  });

  test('assert on RESPONSE headers', async ({ request }) => {
    const response = await request.get('/response-headers?X-Powered-By=Playwright');

    expect(response.headers()['x-powered-by']).toBe('Playwright');   // keys are lower-case
    expect(response.headers()['content-type']).toContain('application/json');
    // headersArray() keeps duplicate headers (e.g. several Set-Cookie)
    expect(response.headersArray().some((h) => h.name.toLowerCase() === 'content-type')).toBe(true);
  });

  test('Content-Type is set automatically from `data`', async ({ request }) => {
    const response = await request.post('/post', { data: { hello: 'world' } });
    const body = await response.json();
    expect(body.headers['Content-Type']).toBe('application/json');
    expect(body.json).toEqual({ hello: 'world' });
  });
});

test.describe('query parameters', () => {
  test('pass params as an object (Playwright encodes them)', async ({ request }) => {
    const response = await request.get('/comments', { params: { postId: 1 } });  // /comments?postId=1

    expect(response.url()).toContain('postId=1');
    const comments = await response.json();
    expect(comments.length).toBeGreaterThan(0);
    for (const c of comments) expect(c.postId).toBe(1);   // filter really worked
  });

  test('multiple params, special characters, and paging', async ({ request }) => {
    const response = await request.get('/posts', {
      params: { userId: 2, _limit: 3, _page: 1 },
    });
    const posts = await response.json();
    expect(posts).toHaveLength(3);
    expect(posts.every((p) => p.userId === 2)).toBe(true);
  });

  test('params are URL-encoded safely', async ({ request }) => {
    const response = await request.get('https://httpbin.org/get', {
      params: { q: 'playwright & api', tag: 'a/b' },
    });
    expect((await response.json()).args).toEqual({ q: 'playwright & api', tag: 'a/b' });
  });
});

test.describe('path parameters', () => {
  test('build the path from a variable', async ({ request }) => {
    const userId = 3;
    const response = await request.get(`/users/${userId}`);       // /users/3
    expect((await response.json()).id).toBe(userId);
  });

  test('nested resources: /posts/{id}/comments', async ({ request }) => {
    const postId = 5;
    const comments = await (await request.get(`/posts/${postId}/comments`)).json();
    expect(comments.every((c) => c.postId === postId)).toBe(true);
  });

  test('data-driven: one test per id', async ({ request }) => {
    for (const id of [1, 2, 3]) {
      const response = await request.get(`/todos/${id}`);
      expect(response.status(), `GET /todos/${id}`).toBe(200);
    }
  });
});
