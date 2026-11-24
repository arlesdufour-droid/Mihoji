import { describe, expect, it } from 'vitest';
import { RESERVED_SUBDOMAINS, slugify, suggestSubdomain, validateSubdomain } from './slug';

describe('sous-domaine d’un site publié', () => {
  it('dérive l’adresse du nom de l’entreprise (accents, ponctuation, ligatures)', () => {
    expect(slugify('Boulangerie Lemoine & Fils')).toBe('boulangerie-lemoine-fils');
    expect(slugify('  L’Atelier d’Élodie — Cœur de ville ')).toBe('l-atelier-d-elodie-coeur-de-ville');
    expect(slugify('***')).toBe('');
  });

  it('refuse les mots réservés, y compris ceux de la liste de la mission', () => {
    for (const word of ['www', 'app', 'admin', 'api', 'mail', 'stripe', 'login', 'studio', 'support']) {
      expect(RESERVED_SUBDOMAINS.has(word)).toBe(true);
      expect(validateSubdomain(word)).toBe('reserve');
    }
    expect(validateSubdomain('boulangerie-lemoine')).toBeNull();
  });

  it('valide la forme : longueur, caractères, tirets', () => {
    expect(validateSubdomain('ab')).toBe('trop_court');
    expect(validateSubdomain('a'.repeat(41))).toBe('trop_long');
    expect(validateSubdomain('Dubois')).toBe('caracteres');
    expect(validateSubdomain('dubois.plomberie')).toBe('caracteres');
    expect(validateSubdomain('dubois_plomberie')).toBe('caracteres');
    expect(validateSubdomain('-dubois')).toBe('tirets');
    expect(validateSubdomain('dubois-')).toBe('tirets');
    expect(validateSubdomain('xn--dubois')).toBe('tirets');
    expect(validateSubdomain('a'.repeat(40))).toBeNull();
  });

  it('propose une adresse libre : nom, puis nom-2, nom-3', () => {
    expect(suggestSubdomain('Dubois Plomberie Chauffage')).toBe('dubois-plomberie-chauffage');
    expect(suggestSubdomain('Dubois Plomberie', new Set(['dubois-plomberie']))).toBe('dubois-plomberie-2');
    expect(suggestSubdomain('Dubois Plomberie', new Set(['dubois-plomberie', 'dubois-plomberie-2']))).toBe('dubois-plomberie-3');
    expect(suggestSubdomain('Dubois', (candidate) => candidate === 'dubois')).toBe('dubois-2');
  });

  it('ne propose jamais un mot réservé ni une adresse invalide', () => {
    expect(suggestSubdomain('Admin')).toBe('admin-site');
    expect(suggestSubdomain('Studio')).toBe('studio-site');
    expect(suggestSubdomain('')).toBe('mon-site');
    expect(suggestSubdomain('Ça')).toBe('ca-site');
    const long = suggestSubdomain('Très longue raison sociale '.repeat(5));
    expect(validateSubdomain(long)).toBeNull();
    expect(long.length).toBeLessThanOrEqual(40);
    const clash = suggestSubdomain('x'.repeat(60), new Set(['x'.repeat(36)]));
    expect(validateSubdomain(clash)).toBeNull();
  });
});
