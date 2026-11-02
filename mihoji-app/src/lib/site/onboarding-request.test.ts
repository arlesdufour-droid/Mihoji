import { describe, expect, it } from 'vitest';
import { designCompanyOf, onboardingSiteSchema, projectNameOf, requestExamples } from './onboarding-request';

describe('demande d’onboarding', () => {
  it('accepte une demande et un style facultatif, refuse le reste', () => {
    expect(onboardingSiteSchema.safeParse({ request: 'Je veux un site chaleureux avec prise de commande en ligne' }).success).toBe(true);
    expect(onboardingSiteSchema.safeParse({ request: 'Un site élégant', style: 'premium' }).success).toBe(true);
    expect(onboardingSiteSchema.safeParse({ request: 'court' }).success).toBe(false);
    expect(onboardingSiteSchema.safeParse({ request: '   ' }).success).toBe(false);
    expect(onboardingSiteSchema.safeParse({ request: 'Un site élégant', style: 'inconnu' }).success).toBe(false);
    expect(onboardingSiteSchema.safeParse({ request: 'x'.repeat(2_001) }).success).toBe(false);
  });

  it('propose trois exemples valides', () => {
    expect(requestExamples).toHaveLength(3);
    for (const example of requestExamples) expect(onboardingSiteSchema.safeParse({ request: example }).success).toBe(true);
  });

  it('déduit le métier, la ville et la présence des coordonnées depuis l’entreprise', () => {
    const { trade, company } = designCompanyOf({ name: 'Boulangerie Brion', activity: '10.71C', address: '12 rue du Port, 17000 La Rochelle', missingFields: { phone: '0546000000', email: ' ' } });
    expect(trade).toBe('Boulangerie et boulangerie-pâtisserie');
    expect(company).toMatchObject({ name: 'Boulangerie Brion', city: 'La Rochelle', hasPhone: true, hasEmail: false });
  });

  it('gère une entreprise saisie à la main, sans coordonnées', () => {
    const { trade, company } = designCompanyOf({ name: 'Atelier Dupont', activity: 'Plomberie et chauffage', address: '3 impasse des Lilas' });
    expect(trade).toBe('Plomberie et chauffage');
    expect(company).toMatchObject({ city: '', hasPhone: false, hasEmail: false });
    expect(projectNameOf({ name: '  ', activity: '', address: '' })).toBe('Mon site');
  });
});
