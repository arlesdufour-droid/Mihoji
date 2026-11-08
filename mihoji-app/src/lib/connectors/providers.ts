import 'server-only';

import { connectorById } from './registry';

// Vérification d'une clé d'API auprès du service (implémentation réelle), avec une simulation active seulement hors production
// quand CONNECTORS_MOCK=1 (tests automatiques) : une clé « test-… » est acceptée, toute autre est refusée. Jamais de simulation en production.
export type VerifyResult = { ok: true; accountLabel: string; scopes: string[] } | { ok: false; error: 'invalid_credentials' | 'unavailable' | 'unsupported' };

export function connectorsMocked(env: Record<string, string | undefined> = process.env): boolean {
  return env.CONNECTORS_MOCK === '1' && env.NODE_ENV !== 'production' && env.APP_ENV !== 'production';
}

export async function verifyCredentials(provider: string, secret: string): Promise<VerifyResult> {
  const definition = connectorById(provider);
  if (!definition || definition.status !== 'available' || definition.auth !== 'api_key') return { ok: false, error: 'unsupported' };
  if (connectorsMocked()) return secret.startsWith('test-') ? { ok: true, accountLabel: `Compte de test (${definition.label})`, scopes: definition.capabilities } : { ok: false, error: 'invalid_credentials' };
  if (provider === 'brevo') {
    try {
      const response = await fetch('https://api.brevo.com/v3/account', { headers: { accept: 'application/json', 'api-key': secret }, signal: AbortSignal.timeout(15_000) });
      if (response.status === 401 || response.status === 403) return { ok: false, error: 'invalid_credentials' };
      if (!response.ok) return { ok: false, error: 'unavailable' };
      const account = await response.json().catch(() => ({})) as { email?: string; companyName?: string };
      return { ok: true, accountLabel: account.companyName || account.email || 'Compte Brevo', scopes: definition.capabilities };
    } catch {
      return { ok: false, error: 'unavailable' };
    }
  }
  return { ok: false, error: 'unsupported' };
}
