import { afterEach, describe, expect, it, vi } from 'vitest';
import { canUseDemoData, isDemoMode } from './config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Supabase configuration modes', () => {
  it('uses demo mode when the database is absent during development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DATABASE_URL', '');
    expect(isDemoMode()).toBe(true);
    expect(canUseDemoData()).toBe(true);
  });

  it('does not use demo mode in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('NEXT_PHASE', '');
    expect(isDemoMode()).toBe(false);
    expect(canUseDemoData()).toBe(false);
  });
});
