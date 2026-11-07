import { describe, expect, it } from 'vitest';
import { composeForFamily, tradeFamilyOf } from './compositions';
import { samples } from './samples';
import { siteSchema } from './schema';
import { benchmarkCases } from './benchmark-cases';

describe('familles de métiers', () => {
  it('reconnaît la famille de chaque cas du banc', () => {
    const expected: Record<string, string | undefined> = { plombier: 'artisan', boulangerie: 'commerce', restaurant: 'restaurant', kine: 'praticien', coach: 'praticien', avocat: 'praticien', fleuriste: 'commerce', garage: 'artisan', photographe: 'photographe', consultant: 'praticien' };
    for (const test of benchmarkCases) {
      if (!(test.id in expected)) continue;
      expect(tradeFamilyOf({ activity: test.company.activity, request: test.request }), test.id).toBe(expected[test.id]);
    }
  });
  it('« devis » ne fait pas passer un artisan pour un caviste', () => {
    expect(tradeFamilyOf({ request: 'Je veux un devis en ligne pour mes travaux de peinture' })).toBe('artisan');
  });
  it('ne reconnaît rien sans indice', () => {
    expect(tradeFamilyOf({ request: 'Je veux un site pour mon entreprise.' })).toBeUndefined();
  });
});

describe('composition par famille', () => {
  const types = (family: Parameters<typeof composeForFamily>[1]) => composeForFamily(siteSchema.parse(samples[0].site), family).pages[0].sections.map((section) => section.type === 'module' ? `module:${section.module}` : section.type);
  it('garde le bandeau en premier et le pied de page en dernier, sans perdre de section', () => {
    const base = siteSchema.parse(samples[0].site).pages[0].sections.length;
    for (const family of ['restaurant', 'artisan', 'praticien', 'photographe', 'commerce'] as const) {
      const out = types(family);
      expect(out).toHaveLength(base);
      expect(out[0]).toBe('hero');
      expect(out.at(-1)).toBe('footer');
    }
  });
  it('met réalisations et prestations avant la présentation chez l’artisan', () => {
    const out = types('artisan');
    if (out.includes('gallery') && out.includes('about')) expect(out.indexOf('gallery')).toBeLessThan(out.indexOf('about'));
    if (out.includes('services') && out.includes('about')) expect(out.indexOf('services')).toBeLessThan(out.indexOf('about'));
  });
  it('ne change rien sans famille', () => {
    const site = siteSchema.parse(samples[0].site);
    expect(composeForFamily(site, undefined)).toBe(site);
  });
});
