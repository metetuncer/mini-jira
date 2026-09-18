import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4200',
    viewport: { width: 1440, height: 960 },
    launchOptions: {
      ...(process.env['CHROMIUM_EXECUTABLE_PATH']
        ? { executablePath: process.env['CHROMIUM_EXECUTABLE_PATH'] }
        : {}),
      args: ['--no-sandbox']
    }
  },
  webServer: {
    command: 'npm start -- --host 127.0.0.1',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120000
  }
});
