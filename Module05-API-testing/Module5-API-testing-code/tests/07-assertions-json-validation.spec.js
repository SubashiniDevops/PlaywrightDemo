const { test, expect } = require('@playwright/test');
const Ajv = require('ajv');

/**
 * TOPICS: API assertions, JSON validation
 * Sample API: https://jsonplaceholder.typicode.com
 */

test.describe('API assertions', () => {
  test('status, ok and url', async ({ request }) => {
    const response = await request.get('/users/1');

    expect(response).toBeOK();                                   // Playwright's built-in 2xx matcher
    expect(response.status()).toBe(200);
    expect(response.url()).toBe('https://jsonplaceholder.typicode.com/users/1');
  });

  test('response headers', async ({ request }) => {
    const response = await request.get('/users/1');
    const headers = response.headers();

    expect(headers['content-type']).toMatch(/application\/json/);
    expect(headers['cache-control']).toBeDefined();
  });

  test('body: exact, partial and type matching', async ({ request }) => {
    const user = await (await request.get('/users/1')).json();

    expect(user.name).toBe('Leanne Graham');                     // exact value
    expect(user).toMatchObject({                                 // partial match (extra keys ignored)
      id: 1,
      username: 'Bret',
      address: { city: 'Gwenborough' },
    });
    expect(user).toEqual(expect.objectContaining({               // asymmetric matchers: check TYPE not value
      id: expect.any(Number),
      email: expect.stringContaining('@'),
      phone: expect.any(String),
    }));
  });

  test('array assertions', async ({ request }) => {
    const todos = await (await request.get('/todos', { params: { userId: 1 } })).json();

    expect(todos.length).toBeGreaterThan(0);
    expect(todos.every((t) => t.userId === 1)).toBe(true);
    expect(todos.map((t) => t.id)).toEqual(expect.arrayContaining([1, 2, 3]));
  });

  test('soft assertions report ALL failures, not just the first', async ({ request }) => {
    const post = await (await request.get('/posts/1')).json();

    expect.soft(post.id).toBe(1);
    expect.soft(post.userId).toBe(1);
    expect.soft(typeof post.title).toBe('string');
  });

  test('response time budget', async ({ request }) => {
    const started = Date.now();
    await request.get('/posts/1');
    expect(Date.now() - started).toBeLessThan(5000);
  });

  test('retry an assertion until it passes (eventually consistent APIs)', async ({ request }) => {
    await expect(async () => {
      const response = await request.get('/posts/1');
      expect(response.status()).toBe(200);
    }).toPass({ timeout: 10_000, intervals: [500, 1000] });

    await expect
      .poll(async () => (await request.get('/posts/1')).status(), { timeout: 10_000 })
      .toBe(200);
  });
});

test.describe('JSON schema validation (Ajv)', () => {
  const ajv = new Ajv({ allErrors: true });

  const postSchema = {
    type: 'object',
    required: ['userId', 'id', 'title', 'body'],
    properties: {
      userId: { type: 'integer', minimum: 1 },
      id: { type: 'integer', minimum: 1 },
      title: { type: 'string', minLength: 1 },
      body: { type: 'string' },
    },
    additionalProperties: false,
  };

  test('one post matches the schema', async ({ request }) => {
    const post = await (await request.get('/posts/1')).json();

    const validate = ajv.compile(postSchema);
    const valid = validate(post);

    expect(valid, JSON.stringify(validate.errors)).toBe(true);
  });

  test('every item in a collection matches the schema', async ({ request }) => {
    const posts = await (await request.get('/posts')).json();
    const validate = ajv.compile({ type: 'array', items: postSchema, minItems: 1 });

    expect(validate(posts), JSON.stringify(validate.errors)).toBe(true);
  });

  test('the schema catches a bad payload (negative check)', async () => {
    const validate = ajv.compile(postSchema);
    const bad = { userId: 'one', id: 1, title: '' };             // wrong type, empty title, missing body

    expect(validate(bad)).toBe(false);
    expect(validate.errors.map((e) => e.keyword)).toEqual(expect.arrayContaining(['type', 'minLength', 'required']));
  });

  test('response is valid JSON and has the expected shape', async ({ request }) => {
    const response = await request.get('/posts/1');
    const text = await response.text();

    expect(() => JSON.parse(text)).not.toThrow();                // it parses
    expect(Object.keys(JSON.parse(text)).sort()).toEqual(['body', 'id', 'title', 'userId']);
  });
});
