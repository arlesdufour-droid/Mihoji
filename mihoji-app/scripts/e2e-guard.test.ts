import { describe, expect, it } from 'vitest';
import { assertE2eEnvironment } from './e2e-guard';

const DEV_DATABASE_URL = 'postgresql://postgres.kvmpprqewmzpyronpacy:secret@aws-1-eu-west-3.pooler.supabase.com:5432/postgres';

describe('assertE2eEnvironment', () => {
  it('accepte l’environnement de développement', () => {
    expect(() => assertE2eEnvironment({ APP_ENV: 'development', DATABASE_URL: DEV_DATABASE_URL })).not.toThrow();
  });

  it('refuse APP_ENV=production', () => {
    expect(() => assertE2eEnvironment({ APP_ENV: 'production', DATABASE_URL: DEV_DATABASE_URL })).toThrow(/APP_ENV=production/);
  });

  it('refuse une DATABASE_URL qui n’est pas celle de développement', () => {
    expect(() => assertE2eEnvironment({ APP_ENV: 'development', DATABASE_URL: 'postgresql://postgres.autreprojet:secret@aws-0-eu-west-3.pooler.supabase.com:5432/postgres' })).toThrow(/DATABASE_URL/);
  });

  it('refuse une DATABASE_URL absente', () => {
    expect(() => assertE2eEnvironment({ APP_ENV: 'development' })).toThrow(/DATABASE_URL/);
  });
});
