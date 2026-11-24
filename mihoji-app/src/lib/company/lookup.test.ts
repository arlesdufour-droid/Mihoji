import { describe, expect, it } from 'vitest';
import nafLabelsJson from './naf-labels.json';
import { isValidSiren, isValidSiret, legalFormLabel, lookupDemoCompany, nafLabel, normalizeNaf, vatNumberFromSiren } from './lookup';

describe('company lookup', () => {
  it('validates a SIRET with the Luhn key', () => {
    expect(isValidSiret('73282932000074')).toBe(true);
    expect(isValidSiret('73282932000075')).toBe(false);
  });

  it('returns simulated company data and VAT number', () => {
    const company = lookupDemoCompany('73282932000074');
    expect(company.status).toBe('active');
    expect(company.siren).toBe('732829320');
    expect(company.vatNumber).toBe(vatNumberFromSiren('732829320'));
  });

  it('accepts La Poste special SIREN and real establishments', () => {
    expect(isValidSiren('356000000')).toBe(true);
    expect(isValidSiret('35600000000048')).toBe(true);
    expect(isValidSiret('73282932000074')).toBe(true);
  });

  it('converts legal and activity codes to readable labels', () => {
    expect(legalFormLabel('5710')).toBe('SAS, société par actions simplifiée');
    expect(nafLabel('10.71C')).toBe('Boulangerie et boulangerie-pâtisserie');
  });
});

describe('nomenclature NAF complète (INSEE)', () => {
  it('contient les 732 sous-classes de la NAF rév. 2, chacune avec un libellé', () => {
    const entries = Object.entries(nafLabelsJson as Record<string, string>);
    expect(entries).toHaveLength(732);
    for (const [code, label] of entries) { expect(code).toMatch(/^\d{2}\.\d{2}[A-Z]$/); expect(label.length, code).toBeGreaterThan(5); }
  });
  it('traduit les codes des métiers courants en libellés officiels', () => {
    expect(nafLabel('43.22A')).toBe('Travaux d\'installation d\'eau et de gaz en tous locaux');
    expect(nafLabel('10.71C')).toBe('Boulangerie et boulangerie-pâtisserie');
    expect(nafLabel('69.10Z')).toBe('Activités juridiques');
    expect(nafLabel('47.78C')).toBe('Autres commerces de détail spécialisés divers');
    expect(nafLabel('86.90E')).toContain('rééducation');
  });
  it('accepte les formes « 4322A », « 43.22a » et refuse de deviner un code inconnu ou un texte', () => {
    expect(normalizeNaf('4322A')).toBe('43.22A');
    expect(normalizeNaf(' 43.22a ')).toBe('43.22A');
    expect(normalizeNaf('Plomberie')).toBeNull();
    expect(nafLabel('4322a')).toBe(nafLabel('43.22A'));
    expect(nafLabel('99.99Z')).toBe('99.99Z');
    expect(nafLabel('Plombier chauffagiste')).toBe('Plombier chauffagiste');
    expect(nafLabel(null)).toBe('Activité non renseignée');
  });
});

import { injectCompanyData } from './render';

describe('rendu des coordonnées dans le HTML', () => {
  it('remplace un ancien code NAF brut par le libellé de l’activité', () => {
    const html = injectCompanyData('<main><p>10.71C</p></main>', { name: 'B', activity: '10.71C', address: '', legalForm: 'SAS' });
    expect(html).toContain('Boulangerie et boulangerie-pâtisserie');
    expect(html).not.toContain('10.71C');
  });
  it('injecte les données de l’entreprise et retire les jetons', () => {
    const html = injectCompanyData('<h1>{{company.name}}</h1><p>{{company.activity}}</p><p>{{company.email}}</p>', { name: 'Atelier X', activity: '43.22A', address: '', legalForm: 'SAS', missingFields: { email: 'a@b.fr' } });
    expect(html).toContain('Atelier X');
    expect(html).toContain('a@b.fr');
    expect(html).toContain("Travaux d&#039;installation d&#039;eau et de gaz en tous locaux");
    expect(html).not.toContain('{{company.');
  });
});
