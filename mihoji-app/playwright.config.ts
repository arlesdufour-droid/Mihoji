import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: 'real-ai.spec.ts',
  timeout: 60_000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3100', headless: true },
  webServer: { command: 'npm run dev -- --hostname 127.0.0.1 --port 3100', url: 'http://127.0.0.1:3100', reuseExistingServer: false, timeout: 120_000, env: { GROQ_API_KEY: '', AI_MOCK: '1' } },
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
});
