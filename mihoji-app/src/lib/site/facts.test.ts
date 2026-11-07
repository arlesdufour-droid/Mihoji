import { describe, expect, it } from 'vitest';
import { credibilityIssues, enforceRealData, factsLines, factsOf, foundedYearOf, parseProfile } from './facts';
import { renderSite } from './render';
import { samples } from './samples';
import { siteSchema, type SiteDescription } from './schema';

const base = () => siteSchema.parse(structuredClone(samples[0].site)) as SiteDescription;
const NOW = new Date('2026-11-07T00:00:00Z');

function withSections(extra: object[]): SiteDescription {
  const site = base();
  const sections = site.pages[0].sections;
  sections.splice(sections.length - 1, 0, ...(extra as typeof sections));
  return siteSchema.parse(site);
}

describe('vraies données de l’entreprise', () => {
  it('ne retient l’année de création que si elle vient d’une source officielle (SIRET), jamais d’une saisie manuelle', () => {
    expect(foundedYearOf({ siret: '12345678901234', createdAt: '2012-03-01' }, NOW)).toBe(2012);
    expect(foundedYearOf({ siret: null, createdAt: '2012-03-01' }, NOW)).toBeUndefined();
    expect(foundedYearOf({ siret: '12345678901234', createdAt: '2026-02-01' }, NOW)).toBeUndefined();
  });

  it('transmet au modèle l’année, les réponses du client et dit explicitement quand les horaires manquent', () => {
    const facts = factsOf({ company: { siret: '12345678901234', createdAt: '2012-03-01' }, profile: { specialties: 'pain au levain', distinction: 'farines locales' }, request: 'Un site' }, NOW);
    const lines = factsLines(facts, NOW).join('\n');
    expect(lines).toContain('2012');
    expect(lines).toContain('14 ans');
    expect(lines).toContain('pain au levain');
    expect(lines).toContain('farines locales');
    expect(lines).toContain('Horaires : NON FOURNIS');
    expect(factsLines({ hours: 'Mardi au samedi, 7 h à 19 h' }, NOW).join('\n')).toContain('Mardi au samedi');
  });

  it('ignore un profil invalide sans planter', () => {
    expect(parseProfile({ specialties: 12, hours: ' lundi ' })).toEqual({ specialties: undefined, distinction: undefined, hours: 'lundi' });
  });

  it('retire les avis, les chiffres sans source et les horaires non fournis, et laisse un emplacement dans le Studio', () => {
    const site = withSections([
      { type: 'testimonials', variant: 'cards', title: 'Ils nous font confiance', items: [{ quote: 'Super boulangerie, je recommande vivement !', author: 'Marie' }] },
      { type: 'stats', variant: 'row', items: [{ value: '4,9/5', label: 'Note moyenne' }, { value: '3200', label: 'Clients servis' }] },
      { type: 'hours', variant: 'table', title: 'Horaires', rows: [{ day: 'Lundi', hours: '7 h – 19 h' }] },
    ]);
    const { site: out, report } = enforceRealData(site, {}, NOW);
    const types = out.pages[0].sections.map((section) => section.type);
    expect(types).not.toContain('testimonials');
    expect(types).not.toContain('stats');
    expect(types).not.toContain('hours');
    expect(report.removed.sort()).toEqual(['hours', 'stats', 'testimonials']);
    expect(out.pages[0].invites?.map((invite) => invite.kind).sort()).toEqual(['hours', 'stats', 'testimonials']);
  });

  it('garde des chiffres clés qui viennent de l’entreprise (année de création, ancienneté) et les horaires fournis', () => {
    const site = withSections([
      { type: 'stats', variant: 'row', items: [{ value: '2012', label: 'Année de création' }, { value: '14', label: 'Années d’existence' }, { value: '9000', label: 'Clients' }] },
      { type: 'hours', variant: 'table', title: 'Horaires', rows: [{ day: 'Mardi au samedi', hours: '7 h – 19 h' }] },
    ]);
    const facts = factsOf({ company: { siret: '12345678901234', createdAt: '2012-03-01' }, profile: { hours: 'Mardi au samedi, 7 h à 19 h' } }, NOW);
    const { site: out } = enforceRealData(site, facts, NOW);
    const stats = out.pages[0].sections.find((section) => section.type === 'stats');
    expect(stats?.type === 'stats' && stats.items.map((item) => item.value)).toEqual(['2012', '14']);
    expect(out.pages[0].sections.some((section) => section.type === 'hours')).toBe(true);
    expect(out.pages[0].invites?.map((invite) => invite.kind)).toEqual(['testimonials']);
  });

  it('repère les chiffres, années, labels et certifications inventés dans les textes', () => {
    const site = base();
    const hero = site.pages[0].sections[0];
    if (hero.type !== 'hero') throw new Error('hero attendu');
    hero.subtitle = 'Boulanger certifié Qualibat depuis 1998, plus de 3000 clients et 98 % de clients satisfaits.';
    const issues = credibilityIssues(site, {}, NOW).join('\n');
    expect(issues).toContain('Qualibat');
    expect(issues).toContain('1998');
    expect(issues).toContain('3000 clients');
    expect(issues).toContain('98 %');
  });

  it('accepte ces mêmes éléments quand le client les a fournis, et ne confond pas prix et taux de remboursement', () => {
    const site = enforceRealData(base(), {}, NOW).site;
    const hero = site.pages[0].sections[0];
    if (hero.type !== 'hero') throw new Error('hero attendu');
    hero.subtitle = 'Boulanger certifié Qualibat depuis 1998, séances remboursées à 60 % dès 12 €.';
    const facts = { userText: 'Nous sommes certifiés Qualibat depuis 1998' };
    expect(credibilityIssues(site, facts, NOW)).toEqual([]);
  });

  it('n’a plus aucun avis ni chiffre inventé dans les sites d’exemple', () => {
    for (const sample of samples) {
      const { site } = enforceRealData(siteSchema.parse(sample.site), {}, NOW);
      expect(credibilityIssues(site, {}, NOW), sample.id).toEqual([]);
    }
  });
});

describe('emplacements « à compléter » (Studio seulement)', () => {
  it('apparaissent dans l’aperçu du Studio et jamais dans le site publié', () => {
    const { site } = enforceRealData(base(), {}, NOW);
    const studio = renderSite(site, { inlineCss: true, studio: true }).files['index.html'];
    const published = renderSite(site, { inlineCss: true }).files['index.html'];
    expect(studio).toContain('data-invite="testimonials"');
    expect(studio).toContain('data-invite="stats"');
    expect(studio).toContain('Cet encart n’apparaît pas sur le site publié');
    expect(published).not.toContain('data-invite');
    expect(published).not.toContain('Cet encart');
  });

  it('disparaissent dès qu’une vraie section du même type existe', () => {
    const { site } = enforceRealData(base(), {}, NOW);
    site.pages[0].sections.splice(2, 0, { type: 'testimonials', variant: 'quote', title: 'Vos mots', items: [{ quote: 'Un avis réel donné par le client.', author: 'Client réel' }] });
    const studio = renderSite(siteSchema.parse(site), { inlineCss: true, studio: true }).files['index.html'];
    expect(studio).not.toContain('data-invite="testimonials"');
    expect(studio).toContain('data-invite="stats"');
  });
});
