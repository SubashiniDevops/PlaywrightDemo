const { test, expect } = require('@playwright/test');

/**
 * TOPIC: Chained API testing: the output of one call feeds the next.
 * Sample APIs: https://jsonplaceholder.typicode.com and https://dummyjson.com
 */

test('chain 1: user -> their posts -> comments on the first post', async ({ request }) => {
  const user = await test.step('GET a user', async () => {
    const response = await request.get('/users/1');
    expect(response.status()).toBe(200);
    return response.json();
  });

  const posts = await test.step('GET that user\'s posts (userId from step 1)', async () => {
    const response = await request.get('/posts', { params: { userId: user.id } });
    expect(response.status()).toBe(200);
    return response.json();
  });
  expect(posts.length).toBeGreaterThan(0);

  await test.step('GET comments for the first post (post id from step 2)', async () => {
    const response = await request.get(`/posts/${posts[0].id}/comments`);
    expect(response.status()).toBe(200);
    const comments = await response.json();
    expect(comments.every((c) => c.postId === posts[0].id)).toBe(true);
  });
});

test.describe('chain 2: login -> token -> protected calls (JWT)', () => {
  test.use({ baseURL: 'https://dummyjson.com' });

  test('use the token and the user id from the login response', async ({ request }) => {
    // Step 1: login, capture token + id
    const loginResponse = await request.post('/auth/login', {
      data: { username: 'emilys', password: 'emilyspass' },
    });
    expect(loginResponse.status()).toBe(200);
    const { accessToken, id } = await loginResponse.json();

    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Step 2: token -> who am I?
    const me = await (await request.get('/auth/me', { headers: authHeader })).json();
    expect(me.id).toBe(id);

    // Step 3: id -> this user's carts
    const cartsResponse = await request.get(`/carts/user/${id}`, { headers: authHeader });
    expect(cartsResponse.status()).toBe(200);
    const { carts } = await cartsResponse.json();

    // Step 4: cart -> first product -> product details
    const productId = carts[0].products[0].id;
    const product = await (await request.get(`/products/${productId}`)).json();
    expect(product.id).toBe(productId);
  });
});

test.describe.serial('chain 3: create -> update -> delete with shared state', () => {
  test.use({ baseURL: 'https://dummyjson.com' });
  let createdId;

  test('create', async ({ request }) => {
    const response = await request.post('/products/add', { data: { title: 'API course mug', price: 9.99 } });
    expect(response.status()).toBe(201);
    const product = await response.json();
    createdId = product.id;                                       // share with the next tests
    expect(createdId).toBeDefined();
  });

  test('update', async ({ request }) => {
    // dummyjson simulates writes, so we update an existing product (id 1) to keep the chain valid
    const response = await request.put('/products/1', { data: { title: 'Renamed by Playwright' } });
    expect(response.status()).toBe(200);
    expect((await response.json()).title).toBe('Renamed by Playwright');
  });

  test('delete', async ({ request }) => {
    const response = await request.delete('/products/1');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ id: 1, isDeleted: true });
    expect(createdId).toBeDefined();                              // the chain carried state across tests
  });
});

test('chain 4: poll until a condition is met', async ({ request }) => {
  // pattern for async jobs: create -> poll status until "done"
  await expect
    .poll(async () => {
      const todo = await (await request.get('/todos/1')).json();
      return todo.id;
    }, { timeout: 10_000 })
    .toBe(1);
});
