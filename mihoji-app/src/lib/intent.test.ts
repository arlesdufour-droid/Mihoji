import { describe, expect, it } from 'vitest';
import { intentFromParams, intentTarget, normalizeSiret, parseIntent, serializeIntent } from './intent';

describe('intention du visiteur', () => {
  it('valide le SIRET (14 chiffres, espaces tolérés)', () => {
    expect(normalizeSiret('552 100 554 00013')).toBe('55210055400013');
    expect(normalizeSiret('1234')).toBeUndefined();
    expect(normalizeSiret('abcdefghijklmn')).toBeUndefined();
  });

  it('lit les paramètres de la page de connexion', () => {
    expect(intentFromParams({ intent: 'agency' })).toEqual({ audience: 'agency' });
    expect(intentFromParams({ intent: 'business', siret: '55210055400013' })).toEqual({ audience: 'business', siret: '55210055400013' });
    expect(intentFromParams({ intent: 'business', manual: '1' })).toEqual({ audience: 'business', manual: true });
    expect(intentFromParams({ intent: 'business', siret: 'pirate<script>' })).toEqual({ audience: 'business' });
    expect(intentFromParams({ intent: 'autre' })).toBeNull();
    expect(intentFromParams({})).toBeNull();
  });

  it('survit à la sérialisation en cookie et rejette un cookie corrompu', () => {
    const intent = { audience: 'business' as const, siret: '55210055400013' };
    expect(parseIntent(serializeIntent(intent))).toEqual(intent);
    expect(parseIntent('%7Bnot-json')).toBeNull();
    expect(parseIntent(undefined)).toBeNull();
  });

  it('envoie l’agence directement dans son espace, sans le choix « Vous créez un site pour… »', () => {
    expect(intentTarget({ audience: 'agency' }, false)).toEqual({ path: '/agency', state: { kind: 'agency', step: 'complete' } });
    expect(intentTarget({ audience: 'agency' }, true).path).toBe('/agency');
  });

  it('envoie une entreprise vers son SIRET, sa saisie manuelle ou son projet existant', () => {
    expect(intentTarget({ audience: 'business', siret: '55210055400013' }, false).path).toBe('/onboarding/siret?siret=55210055400013');
    expect(intentTarget({ audience: 'business' }, false).path).toBe('/onboarding/siret');
    expect(intentTarget({ audience: 'business', manual: true }, false).path).toBe('/onboarding/manual');
    expect(intentTarget({ audience: 'business', siret: '55210055400013' }, true).path).toBe('/studio/demo');
  });
});
