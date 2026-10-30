import { describe, expect, it } from 'vitest';
import { lookupDemoCompany } from '../company/lookup';
import { createDemoProject } from './site';

describe('demo site template', () => {
  it('creates a project with company data and legal link', () => {
    const project = createDemoProject(lookupDemoCompany('73282932000074'), { email: 'bonjour@example.fr', phone: '0102030405' });
    expect(project.name).toBe('Entreprise de démonstration');
    expect(project.html).toContain('Entreprise de démonstration');
    expect(project.html).toContain('mentions-legales');
  });
});
