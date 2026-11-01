import { defineConfig } from '@playwright/test';

// Suite « vraie clé » : reproduit le parcours exact de l'interface contre le serveur de dev (port 3000),
// SANS AI_MOCK — les réponses viennent réellement de Groq. Lancer : npm run test:e2e:real
export default defineConfig({
  testDir: './e2e',
  testMatch: 'real-ai.spec.ts',
  timeout: 180_000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3000', headless: true },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:3000', reuseExistingServer: true, timeout: 120_000 },
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
});
