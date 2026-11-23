const { defineConfig } = require('@playwright/test');

// API tests need no browser. The `request` fixture is built from these `use` options.
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 1,                       // public demo APIs can be flaky
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Default for every request in the project; individual files override with test.use()
    baseURL: 'https://jsonplaceholder.typicode.com',
    extraHTTPHeaders: { Accept: 'application/json' },
  },
});
