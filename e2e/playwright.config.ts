import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: [
    {
      command: 'node ./scripts/start-backend.mjs',
      url: 'http://127.0.0.1:4100/health',
      reuseExistingServer: false,
      timeout: 30000,
      env: {
        PLAYWRIGHT_BACKEND_PORT: '4100'
      }
    },
    {
      command: 'node ./scripts/start-frontend.mjs',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      timeout: 30000,
      env: {
        PLAYWRIGHT_FRONTEND_PORT: '4173',
        VITE_API_BASE_URL: 'http://127.0.0.1:4100/api'
      }
    }
  ]
});
