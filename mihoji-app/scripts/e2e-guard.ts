import { readFileSync } from 'node:fs';

// Project ref of the development Supabase project (public, browser-visible value).
const DEV_SUPABASE_PROJECT_REF = 'kvmpprqewmzpyronpacy';

export const E2E_EMAIL_PREFIX = 'e2e+';
export const E2E_EMAIL_DOMAIN = 'mihoji.test';
export const E2E_EMAIL_LIKE = `${E2E_EMAIL_PREFIX}%@${E2E_EMAIL_DOMAIN}`;
// Formats utilisés par les exécutions précédentes, à nettoyer aussi.
export const E2E_LEGACY_EMAIL_LIKES = ['e2e-%@mihoji.local', 'prove-%@mihoji.local'];

export function loadEnv() {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

export function assertE2eEnvironment(env: Record<string, string | undefined> = process.env) {
  if (env.APP_ENV === 'production') {
    throw new Error('Tests e2e refusés : APP_ENV=production. Les tests e2e ne tournent que contre l’environnement de développement.');
  }
  if (!env.DATABASE_URL?.includes(DEV_SUPABASE_PROJECT_REF)) {
    throw new Error('Tests e2e refusés : DATABASE_URL n’est pas celle de la base de développement.');
  }
}
