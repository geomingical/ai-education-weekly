import { defineConfig, devices } from '@playwright/test';

// Runs against the PRODUCTION build, not the dev server: that is what validates
// prerendering, asset paths, and any production-only failure the dev server
// would conceal.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4322',
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // `astro preview` daemonizes and exits, which Playwright reads as a crashed
    // web server, so the built output is served by a plain foreground static
    // server instead. Same dist/, same production artifacts.
    command: 'npx astro build && npx sirv dist --port 4322 --quiet',
    url: 'http://localhost:4322',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
