import { describe, expect, it } from 'vitest';
import { samples, withSamplePhotos } from '@/lib/site/samples';
import { siteSchema } from '@/lib/site/schema';
import { companyForSnapshot, renderSnapshotFiles, resolveFile, siteSecurityHeaders, withSeo, type PublishedSnapshot } from './snapshot';

const site = siteSchema.parse(withSamplePhotos(samples.find((sample) => sample.id === 'boulangerie')!.site));
const company = companyForSnapshot({ name: 'Maison Test', activity: 'Boulangerie', address: '3 rue du Four, 21000 Dijon', legalForm: 'SAS', email: 'bonjour@test.example', phone: '03 53 01 00 00' });
const snapshot: PublishedSnapshot = { v: 1, projectId: '11111111-1111-4111-8111-111111111111', assetOrigin: 'https://app.mihoji.example', company, site, files: null };

describe('rendu d’une version publiée', () => {
  const files = renderSnapshotFiles(snapshot);

  it('rend la description : coordonnées injectées, identifiant du site, aucun jeton restant, aucun script', () => {
    const index = files['index.html'];
    expect(index).toContain('Maison Test');
    expect(index).not.toContain('{{');
    expect(index).not.toContain('<script');
    expect(index).toContain('11111111-1111-4111-8111-111111111111');
  });

  it('formulaires, polices et photos pointent vers l’application en adresses absolues', () => {
    const joined = Object.values(files).join('\n');
    expect(joined).not.toMatch(/action="\/api\//);
    expect(joined).not.toMatch(/src="\/api\//);
    expect(joined).toContain('https://app.mihoji.example/fonts/');
  });

  it('un ancien site en HTML est servi tel quel, avec les coordonnées de l’entreprise', () => {
    const legacy = renderSnapshotFiles({ ...snapshot, site: null, files: { 'index.html': '<html><head><title>x</title></head><body>{{company.name}}</body></html>' } });
    expect(legacy['index.html']).toContain('Maison Test');
  });
});

describe('référencement propre à chaque site', () => {
  const seo = withSeo(renderSnapshotFiles(snapshot), 'https://maison-test.sites.example');

  it('chaque page a sa balise canonique sur l’adresse du site, une seule fois', () => {
    expect(seo['index.html']).toContain('<link rel="canonical" href="https://maison-test.sites.example/">');
    expect(seo['index.html'].match(/rel="canonical"/g)).toHaveLength(1);
    const again = withSeo(seo, 'https://www.maison-test.fr');
    expect(again['index.html']).toContain('href="https://www.maison-test.fr/"');
    expect(again['index.html'].match(/rel="canonical"/g)).toHaveLength(1);
  });

  it('un ancien site (fragment HTML sans <head>) reçoit aussi sa balise canonique', () => {
    const out = withSeo({ 'index.html': '<main><h1>Bonjour</h1></main>' }, 'https://ancien.sites.example');
    expect(out['index.html']).toContain('<link rel="canonical" href="https://ancien.sites.example/">');
    expect(out['index.html']).toContain('<main><h1>Bonjour</h1></main>');
    expect(out['index.html'].startsWith('<!doctype html>')).toBe(true);
    const withHead = withSeo({ 'index.html': '<html><head><meta charset="utf-8"></head><body>x</body></html>' }, 'https://a.example');
    expect(withHead['index.html']).toContain('<head><link rel="canonical" href="https://a.example/"><meta charset="utf-8">');
  });

  it('robots.txt et sitemap.xml donnent l’adresse du site, jamais celle de l’application', () => {
    expect(seo['robots.txt']).toContain('Sitemap: https://maison-test.sites.example/sitemap.xml');
    expect(seo['sitemap.xml']).toContain('<loc>https://maison-test.sites.example/</loc>');
    expect(seo['sitemap.xml']).not.toContain('app.mihoji.example');
  });

  it('un site non indexable (indisponible) interdit l’exploration', () => {
    expect(withSeo({}, 'https://x.example', { indexable: false })['robots.txt']).toContain('Disallow: /');
  });
});

describe('chemin demandé → fichier', () => {
  const files = { 'index.html': 'a', 'tarifs.html': 'b', 'styles.css': 'c' };
  it('résout l’accueil, les pages avec ou sans extension et la feuille de style', () => {
    expect(resolveFile(files, [])).toBe('index.html');
    expect(resolveFile(files, ['tarifs'])).toBe('tarifs.html');
    expect(resolveFile(files, ['tarifs.html'])).toBe('tarifs.html');
    expect(resolveFile(files, ['styles.css'])).toBe('styles.css');
  });
  it('refuse l’inconnu et toute remontée de dossier', () => {
    expect(resolveFile(files, ['absent'])).toBeNull();
    expect(resolveFile(files, ['..', 'etc'])).toBeNull();
    expect(resolveFile(files, ['constructor'])).toBeNull();
  });
});

describe('en-têtes de sécurité', () => {
  it('interdit les scripts et limite les formulaires à l’application et à Stripe', () => {
    const csp = siteSecurityHeaders('https://app.mihoji.example')['Content-Security-Policy'];
    expect(csp).toContain("script-src 'none'");
    expect(csp).toContain("form-action 'self' https://app.mihoji.example https://checkout.stripe.com");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
