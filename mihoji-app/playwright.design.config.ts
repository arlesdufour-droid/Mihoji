import { defineConfig } from '@playwright/test';

// Captures d'écran du design des sites générés, contre le serveur de développement du port 3000 (npm run design:screenshots).
export default defineConfig({
  testDir: './e2e',
  testMatch: ['design-screenshots.spec.ts', 'phase-q-lot-1.spec.ts'],
  timeout: 240_000,
  workers: 1,
  expect: { timeout: 20_000 },
  use: { baseURL: 'http://127.0.0.1:3000', headless: true },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:3000', reuseExistingServer: true, timeout: 120_000 },
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
});
