import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderSite } from '../site/render';
import { samples } from '../site/samples';
import { credibilityIssues, enforceRealData, factsOf } from '../site/facts';
import { siteSchema } from '../site/schema';
import { designCompanyOf } from '../site/onboarding-request';
import { vitrineCases, VITRINE_NOTICE } from './cases';
import { extensionOf, hostedPhotoIds, rewriteHostedPhotos, staticPhotoPath } from './photos';
import { listVitrineEntries, parseDescription, renderVitrineHtml } from './store';

describe('cas de la vitrine : 8 entreprises fictives de familles différentes', () => {
  it('couvre les huit métiers demandés, avec des identifiants uniques', () => {
    expect(vitrineCases.map((item) => item.slug).sort()).toEqual(['boulangerie', 'coach', 'coiffeur', 'electricien', 'kinesitherapeute', 'photographe', 'plombier', 'restaurant']);
    expect(new Set(vitrineCases.map((item) => item.slug)).size).toBe(8);
  });
  it('chaque cas active un module transactionnel adapté, et les quatre types sont représentés', () => {
    expect(new Set(vitrineCases.map((item) => item.module))).toEqual(new Set(['quote', 'booking-deposit', 'booking', 'shop']));
    const bySlug = Object.fromEntries(vitrineCases.map((item) => [item.slug, item.module]));
    expect(bySlug).toMatchObject({ plombier: 'quote', boulangerie: 'shop', coiffeur: 'booking-deposit', photographe: 'quote' });
  });
  it('les coordonnées sont fictives et sûres : domaine « .example » et numéros réservés à la fiction', () => {
    for (const item of vitrineCases) {
      expect(item.company.email, item.slug).toMatch(/@[a-z0-9-]+\.example$/);
      expect(item.company.phone, item.slug).toMatch(/^(01 99 00|02 61 91|03 53 01|04 65 71|05 36 49|06 39 98|09 75 18) \d\d \d\d$/);
    }
  });
  it('aucune ancienneté, aucun avis ni certification n’est fourni au modèle (rien d’inventé)', () => {
    for (const item of vitrineCases) {
      const text = JSON.stringify([item.profile, item.request]).toLowerCase();
      expect(text, item.slug).not.toMatch(/certifi|label |qualibat|avis client|depuis \d{4}|ans d'expérience|ans d’expérience/);
      const { company } = designCompanyOf({ name: item.company.name, activity: item.company.activity, address: item.company.address, missingFields: { phone: item.company.phone, email: item.company.email } });
      expect(factsOf({ company: { address: item.company.address }, profile: item.profile, request: item.request, city: company.city }).foundedYear, item.slug).toBeUndefined();
    }
  });
});

describe('photos hébergées → fichiers statiques', () => {
  const id1 = '0aea97ac-e5f3-4136-b0c4-de3aeb0081ab';
  const id2 = '6fbda32b-d416-4cda-81d6-794acc513ff4';
  const site = { a: { image: { src: `/api/hosted-photos/${id1}` } }, b: [{ src: `/api/hosted-photos/${id2}` }, { src: `/api/hosted-photos/${id1}` }], c: 'https://images.unsplash.com/photo-1' };
  it('repère chaque photo hébergée une seule fois', () => { expect(hostedPhotoIds(site)).toEqual([id1, id2]); });
  it('remplace chaque adresse par son chemin statique et laisse le reste intact', () => {
    const out = rewriteHostedPhotos(site, { [id1]: '/vitrine/x/photo-01.webp', [id2]: '/vitrine/x/photo-02.jpg' });
    expect(JSON.stringify(out)).not.toContain('hosted-photos');
    expect(out.b[1].src).toBe('/vitrine/x/photo-01.webp');
    expect(out.c).toBe('https://images.unsplash.com/photo-1');
  });
  it('refuse une photo sans fichier (jamais une photo cassée en silence)', () => {
    expect(() => rewriteHostedPhotos(site, { [id1]: '/vitrine/x/photo-01.webp' })).toThrow('photo_hebergee_sans_fichier');
  });
  it('chemins et extensions', () => {
    expect(staticPhotoPath('coach', 0, 'webp')).toBe('/vitrine/coach/photo-01.webp');
    expect(staticPhotoPath('coach', 11, 'jpg')).toBe('/vitrine/coach/photo-12.jpg');
    expect([extensionOf('image/webp'), extensionOf('image/jpeg'), extensionOf('image/png'), extensionOf('image/gif')]).toEqual(['webp', 'jpg', 'png', null]);
  });
});

describe('rendu avec la mention « entreprise fictive »', () => {
  const site = siteSchema.parse(samples[0].site);
  it('affiche la mention en permanence quand elle est demandée, jamais sinon', () => {
    expect(renderSite(site, { inlineCss: true, notice: VITRINE_NOTICE }).files['index.html']).toContain('class="demo-notice" role="note">Entreprise fictive');
    expect(renderSite(site, { inlineCss: true }).files['index.html']).not.toContain('demo-notice" role');
  });
});

// Intégrité des 8 sites enregistrés dans le dépôt (description structurée + photos statiques) : la vitrine ne dépend ni de l'IA ni de la base.
describe('sites d’exemple enregistrés dans le dépôt', () => {
  const entries = listVitrineEntries();
  // Budget : 0,50 € pour 8 générations réelles ; le garde-fou du script s'arrête avant de le dépasser (les sites manquants sont à générer après accord sur un budget complémentaire).
  it('au moins 6 des 8 sites sont présents, dans l’ordre des cas, générés par une vraie IA, pour un coût total de 0,50 € au plus', () => {
    expect(entries.length).toBeGreaterThanOrEqual(6);
    const order = vitrineCases.map((item) => item.slug);
    expect(entries.map((entry) => entry.slug)).toEqual(order.filter((slug) => entries.some((entry) => entry.slug === slug)));
    expect(entries.reduce((sum, entry) => sum + entry.costEur, 0)).toBeLessThanOrEqual(0.5);
    for (const entry of entries) { expect(entry.model, entry.slug).toMatch(/^claude-/); expect(entry.attempts).toBeGreaterThanOrEqual(1); }
  });
  for (const item of entries.map((entry) => vitrineCases.find((candidate) => candidate.slug === entry.slug)!)) {
    it(`${item.slug} : description valide, module « ${item.module} » actif, photos statiques présentes, rien d’inventé, mention visible`, () => {
      const entry = entries.find((candidate) => candidate.slug === item.slug);
      expect(entry, 'site absent').toBeTruthy();
      const site = parseDescription(entry!);
      // Module transactionnel demandé.
      const modules = site.modules ?? {};
      if (item.module === 'quote') expect(modules.quote || site.pages[0].sections.some((section) => section.type === 'contact' && section.mode === 'quote')).toBeTruthy();
      if (item.module === 'booking') expect(modules.booking).toBeTruthy();
      if (item.module === 'booking-deposit') { expect(modules.booking).toBeTruthy(); expect(modules.booking!.payment).not.toBe('none'); }
      if (item.module === 'shop') expect(modules.shop).toBeTruthy();
      // Photos : plus aucune adresse de base de données ; chaque fichier statique existe.
      const json = JSON.stringify(entry!.description);
      expect(json).not.toContain('/api/hosted-photos/');
      for (const match of json.matchAll(/"src":"(\/vitrine\/[^"]+)"/g)) expect(existsSync(resolve(process.cwd(), 'public', match[1].slice(1))), match[1]).toBe(true);
      // Vraies données uniquement : aucun avis ni chiffre ni certification inventé.
      const { company } = designCompanyOf({ name: item.company.name, activity: item.company.activity, address: item.company.address, missingFields: { phone: item.company.phone, email: item.company.email } });
      const facts = factsOf({ company: { address: item.company.address }, profile: item.profile, request: item.request, city: company.city });
      expect(credibilityIssues(site, facts)).toEqual([]);
      expect(enforceRealData(site, facts).report.removed).toEqual([]);
      expect(site.pages[0].sections.map((section) => section.type)).not.toContain('testimonials');
      // Rendu : mention visible, aucun jeton non remplacé, aucun script, aucun texte de remplissage.
      const html = renderVitrineHtml(entry!);
      expect(html).toContain(VITRINE_NOTICE);
      expect(html).not.toContain('{{');
      expect(html).not.toContain('<script');
      expect(html.toLowerCase()).not.toMatch(/lorem ipsum|texte à venir|nom du service/);
      expect(html).toContain(item.company.name);
    });
  }
});
