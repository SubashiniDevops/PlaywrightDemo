const { test, expect } = require('@playwright/test');

/**
 * TOPICS: GET, POST, PUT, DELETE requests
 * Sample API: https://jsonplaceholder.typicode.com
 * NOTE: it accepts writes but does NOT persist them (a POSTed post cannot be read back).
 */

test.describe('GET', () => {
  test('GET a single resource', async ({ request }) => {
    const response = await request.get('/posts/1');
    expect(response.status()).toBe(200);

    const post = await response.json();
    expect(post).toMatchObject({ id: 1, userId: 1 });
    expect(post.title).toBeTruthy();
  });

  test('GET a collection and check its size', async ({ request }) => {
    const posts = await (await request.get('/posts')).json();
    expect(posts).toHaveLength(100);
  });

  test('GET a missing resource returns 404', async ({ request }) => {
    const response = await request.get('/posts/0');
    expect(response.status()).toBe(404);
    expect(response.ok()).toBe(false);
  });
});

test.describe('POST', () => {
  test('POST creates a resource (201 Created)', async ({ request }) => {
    const payload = { title: 'Playwright API testing', body: 'Module 05', userId: 7 };

    const response = await request.post('/posts', { data: payload });  // data -> JSON body + header

    expect(response.status()).toBe(201);
    const created = await response.json();
    expect(created).toMatchObject(payload);        // server echoes what we sent
    expect(created.id).toBe(101);                  // the fake server assigns the next id
  });

  test('POST with form-encoded body', async ({ request }) => {
    const response = await request.post('https://httpbin.org/post', {
      form: { username: 'qa', role: 'tester' },    // application/x-www-form-urlencoded
    });
    expect((await response.json()).form).toEqual({ username: 'qa', role: 'tester' });
  });
});

test.describe('PUT and PATCH', () => {
  test('PUT replaces the whole resource', async ({ request }) => {
    const replacement = { id: 1, title: 'Replaced title', body: 'Replaced body', userId: 1 };

    const response = await request.put('/posts/1', { data: replacement });

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(replacement);
  });

  test('PATCH changes only the fields you send', async ({ request }) => {
    const response = await request.patch('/posts/1', { data: { title: 'Only the title changed' } });

    expect(response.status()).toBe(200);
    const updated = await response.json();
    expect(updated.title).toBe('Only the title changed');
    expect(updated.userId).toBe(1);                // untouched fields remain
  });
});

test.describe('DELETE', () => {
  test('DELETE removes the resource (200 with empty body here)', async ({ request }) => {
    const response = await request.delete('/posts/1');

    expect(response.status()).toBe(200);           // many APIs return 204 No Content instead
    expect(await response.json()).toEqual({});
  });
});
