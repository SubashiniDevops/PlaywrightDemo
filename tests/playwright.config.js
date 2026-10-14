// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  /* HTML report (open with: npx playwright show-report) + live console output */
  reporter: [['html', { open: 'never' }], ['list']],

  /* Timeouts */
  timeout: 60 * 1000,              // max time for each test: 60 s
  expect: { timeout: 10 * 1000 },  // max time for each expect() assertion
  // globalTimeout: 10 * 60 * 1000, // optional cap for the WHOLE run (10 min)

  use: {
    /* Screenshot: 'on' = every test, 'only-on-failure' = failures only */
    screenshot: 'on',

    /* Video: 'on' = every test, 'retain-on-failure' = keep only failed tests */
    video: 'on',

    /* Trace: 'on' = every test, 'retain-on-failure' = keep only failed tests.
       View with: npx playwright show-trace <path-to-trace.zip> */
    trace: 'on',
  },

  /* One browser keeps runs fast. Uncomment the others when needed. */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
