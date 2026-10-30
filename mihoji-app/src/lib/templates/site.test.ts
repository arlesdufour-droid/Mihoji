import { describe, expect, it } from 'vitest';
import { lookupDemoCompany } from '../company/lookup';
import { injectCompanyData } from '../company/render';
import { createDemoProject } from './site';

describe('demo site template', () => {
  it('creates a project with company tokens and legal link', () => {
    const project = createDemoProject(lookupDemoCompany('73282932000074'), { email: 'bonjour@example.fr', phone: '0102030405' });
    expect(project.name).toBe('Entreprise de démonstration');
    expect(project.html).toContain('{{company.name}}');
    expect(project.html).toContain('{{company.activity}}');
    expect(project.html).toContain('mentions-legales');
  });

  it('injects company data at render time', () => {
    const company = lookupDemoCompany('73282932000074');
    const project = createDemoProject(company, { email: 'bonjour@example.fr', phone: '0102030405' });
    const html = injectCompanyData(project.html, { ...company, missingFields: { email: 'bonjour@example.fr', phone: '0102030405' } });
    expect(html).toContain('Entreprise de démonstration');
    expect(html).toContain('Création de sites internet');
    expect(html).toContain('bonjour@example.fr');
    expect(html).not.toContain('{{company.');
  });

  it('replaces legacy raw NAF codes with the current activity label', () => {
    const html = injectCompanyData('<main><p>10.71C</p></main>', { name: 'B', activity: '10.71C', address: '', legalForm: 'SAS' });
    expect(html).toContain('Boulangerie et boulangerie-pâtisserie');
    expect(html).not.toContain('10.71C');
  });
});
