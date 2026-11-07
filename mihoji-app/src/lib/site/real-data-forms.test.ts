import { describe, expect, it } from 'vitest';
import { applyHoursForm, applyStatsForm, currentForms, hoursSummary } from './real-data-forms';
import { samples } from './samples';
import { siteSchema, type SiteDescription } from './schema';

const base = (): SiteDescription => {
  const site = structuredClone(siteSchema.parse(samples[0].site));
  site.pages[0].sections = site.pages[0].sections.filter((section) => section.type !== 'hours' && section.type !== 'stats' && section.type !== 'testimonials');
  return site;
};
const types = (site: SiteDescription) => site.pages[0].sections.map((section) => section.type);
const form = (hours: Record<string, string>) => ({ rows: Object.entries(hours).map(([day, value]) => ({ day, hours: value })) });

describe('formulaire des horaires', () => {
  it('ajoute la section avant le plan, ignore les jours vides et retire l’encart « à compléter »', () => {
    const site = applyHoursForm(base(), { ...form({ Lundi: '8 h – 19 h', Mardi: '', Dimanche: 'Fermé' }), note: 'Fermé les jours fériés' });
    const section = site.pages[0].sections.find((candidate) => candidate.type === 'hours');
    expect(section?.type === 'hours' && section.rows.map((row) => row.day)).toEqual(['Lundi', 'Dimanche']);
    expect(types(site).indexOf('hours')).toBeLessThan(types(site).indexOf('map'));
    expect(site.pages[0].invites?.some((invite) => invite.kind === 'hours') ?? false).toBe(false);
  });
  it('remplace la section existante au lieu d’en ajouter une deuxième, puis la retire quand tout est vide', () => {
    const once = applyHoursForm(base(), form({ Lundi: '9 h – 12 h' }));
    const twice = applyHoursForm(once, form({ Lundi: '10 h – 13 h' }));
    expect(types(twice).filter((type) => type === 'hours')).toHaveLength(1);
    expect(currentForms(twice).hours.rows[0].hours).toBe('10 h – 13 h');
    const cleared = applyHoursForm(twice, form({ Lundi: '' }));
    expect(types(cleared)).not.toContain('hours');
    expect(cleared.pages[0].invites?.some((invite) => invite.kind === 'hours')).toBe(true);
  });
  it('résume les horaires pour le profil de l’entreprise (300 caractères au plus)', () => {
    expect(hoursSummary(form({ Lundi: '8 h – 19 h', Mardi: '' }))).toBe('Lundi 8 h – 19 h');
    expect(hoursSummary(form(Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`Jour ${i}`, 'x'.repeat(30)])))).length).toBeLessThanOrEqual(300);
  });
});

describe('formulaire des chiffres clés', () => {
  it('exige au moins deux chiffres complets', () => {
    expect(applyStatsForm(base(), { items: [{ value: '350', label: 'chantiers' }, { value: '', label: 'sans valeur' }] })).toEqual({ ok: false, error: 'two_required' });
  });
  it('insère la section avant l’appel à l’action et la retire quand tout est vide', () => {
    const result = applyStatsForm(base(), { items: [{ value: '2008', label: 'année de création' }, { value: '350', label: 'chantiers réalisés' }] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(types(result.site)).toContain('stats');
    expect(result.site.pages[0].invites?.some((invite) => invite.kind === 'stats') ?? false).toBe(false);
    const cleared = applyStatsForm(result.site, { items: [] });
    expect(cleared.ok && types(cleared.site)).not.toContain('stats');
    expect(cleared.ok && cleared.site.pages[0].invites?.some((invite) => invite.kind === 'stats')).toBe(true);
  });
});
