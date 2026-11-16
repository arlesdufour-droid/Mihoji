import { defineConfig } from '@playwright/test';

// Test RÉEL de Stripe en MODE TEST (rendez-vous avec acompte et boutique) : vraie API Stripe avec STRIPE_SECRET_KEY de .env.local (clé sk_test_ obligatoire),
// vraies pages Stripe Checkout, webhooks reçus par la Stripe CLI (stripe listen --forward-connect-to …/api/webhooks/stripe) et secret STRIPE_WEBHOOK_SECRET.
// L'IA est simulée (AI_MOCK) et les emails aussi : aucune dépense d'IA. Serveur sur le port 3200, dossier de build séparé.
// Lancer : npm run test:e2e:stripe (voir docs/phase-q-progress.md pour la préparation).
export default defineConfig({
  testDir: './e2e',
  testMatch: ['stripe-real.spec.ts'],
  timeout: 300_000,
  workers: 1,
  expect: { timeout: 30_000 },
  use: { baseURL: 'http://127.0.0.1:3200', headless: true, locale: 'en-US', launchOptions: { args: ['--disable-dev-shm-usage'] } },
  webServer: { command: 'npm run dev -- --hostname 127.0.0.1 --port 3200', url: 'http://127.0.0.1:3200', reuseExistingServer: false, timeout: 120_000, env: { GROQ_API_KEY: '', ANTHROPIC_API_KEY: '', AI_MOCK: '1', CONNECTORS_MOCK: '1', BREVO_API_KEY: '', NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3200', NEXT_DIST_DIR: '.next-stripe' } },
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
});
