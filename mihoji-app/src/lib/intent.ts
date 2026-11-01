// Intention du visiteur (créer un site pour son entreprise, ou espace agence), conservée entre la page d'accueil,
// la connexion par lien magique et l'arrivée dans l'application. Aucune donnée sensible : un SIRET est public.

export const INTENT_COOKIE = 'mihoji_intent';

export type Intent = { audience: 'business' | 'agency'; siret?: string; manual?: boolean };

export type IntentTarget = {
  path: string;
  state?: { kind: 'business' | 'agency'; step: string };
};

export function normalizeSiret(value: string | null | undefined): string | undefined {
  const digits = (value ?? '').replace(/\s/g, '');
  return /^\d{14}$/.test(digits) ? digits : undefined;
}

export function intentFromParams(params: { intent?: string | null; siret?: string | null; manual?: string | null }): Intent | null {
  if (params.intent === 'agency') return { audience: 'agency' };
  if (params.intent !== 'business') return null;
  const siret = normalizeSiret(params.siret);
  return { audience: 'business', ...(siret ? { siret } : {}), ...(params.manual === '1' ? { manual: true } : {}) };
}

export function serializeIntent(intent: Intent): string {
  return encodeURIComponent(JSON.stringify(intent));
}

export function parseIntent(raw: string | null | undefined): Intent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as { audience?: string; siret?: string; manual?: boolean };
    return intentFromParams({ intent: value.audience, siret: value.siret, manual: value.manual ? '1' : null });
  } catch {
    return null;
  }
}

// Destination d'un visiteur connecté selon son intention : jamais le choix « Vous créez un site pour… ».
export function intentTarget(intent: Intent, hasProject: boolean): IntentTarget {
  if (intent.audience === 'agency') return { path: '/agency', state: { kind: 'agency', step: 'complete' } };
  if (hasProject) return { path: '/studio/demo' };
  if (intent.manual) return { path: '/onboarding/manual', state: { kind: 'business', step: 'manual' } };
  return { path: intent.siret ? `/onboarding/siret?siret=${intent.siret}` : '/onboarding/siret', state: { kind: 'business', step: 'siret' } };
}
