import { describe, expect, it } from 'vitest';
import { injectCompanyData, cityOf } from '../company/render';
import { contrastRatio, parseColor } from '../engine/contrast';
import { structureIssues } from '../engine/html-analysis';
import { renderSite } from './render';
import { catalogueSection, catalogueSite, samples } from './samples';
import { findFiller, sectionSchema, sectionTypes, sectionVariants, siteSchema, styleIds } from './schema';
import { guaranteedPairs, styles } from './themes';

describe('thèmes', () => {
  it('propose 4 styles complets, chacun avec au plus 2 familles de polices', () => {
    expect(styles.map((style) => style.id)).toEqual([...styleIds]);
    for (const style of styles) {
      expect(new Set([style.fonts.heading.family, style.fonts.body.family]).size).toBeLessThanOrEqual(2);
      expect(style.palettes.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('garantit le contraste WCAG AA (4,5:1) de chaque paire texte/fond de chaque palette', () => {
    for (const style of styles) {
      for (const palette of style.palettes) {
        for (const [foreground, background] of guaranteedPairs) {
          const ratio = contrastRatio(parseColor(palette[foreground])!, parseColor(palette[background])!);
          expect(ratio, `${style.id}/${palette.id} : ${foreground} sur ${background}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});

describe('schéma de description', () => {
  it('propose 15 types de sections avec 2 ou 3 variantes chacun', () => {
    expect(sectionTypes).toHaveLength(15);
    for (const type of sectionTypes) expect(sectionVariants[type].length, type).toBeGreaterThanOrEqual(2);
    for (const type of sectionTypes) expect(sectionVariants[type].length, type).toBeLessThanOrEqual(3);
  });

  it('valide chaque type de section dans chacune de ses variantes', () => {
    for (const type of sectionTypes) {
      for (const variant of sectionVariants[type]) expect(sectionSchema.safeParse(catalogueSection(type, variant)).success, `${type}/${variant}`).toBe(true);
    }
  });

  it('valide les 4 sites d’exemple', () => {
    for (const sample of samples) expect(siteSchema.safeParse(sample.site).success, sample.id).toBe(true);
  });

  it('refuse les liens dangereux et les images non sécurisées', () => {
    const valid = siteSchema.parse(samples[0].site);
    const bad = structuredClone(valid);
    bad.primaryCta.href = 'javascript:alert(1)';
    expect(siteSchema.safeParse(bad).success).toBe(false);
    const image = structuredClone(valid);
    (image.pages[0].sections[0] as { image?: { src?: string } }).image = { src: 'http://exemple.fr/a.jpg', alt: 'x' } as never;
    expect(siteSchema.safeParse(image).success).toBe(false);
  });

  it('refuse le texte de remplissage', () => {
    expect(findFiller({ a: 'Lorem ipsum dolor sit amet' })).toHaveLength(1);
    expect(findFiller({ a: 'Nom du service' })).toHaveLength(1);
    expect(findFiller({ a: 'Service 1' })).toHaveLength(1);
    expect(findFiller({ a: 'Votre texte ici' })).toHaveLength(1);
    expect(findFiller({ a: 'Pain de campagne au levain, croûte épaisse.' })).toHaveLength(0);
    const site = structuredClone(siteSchema.parse(samples[0].site));
    (site.pages[0].sections[1] as { title: string }).title = 'Texte à venir';
    expect(siteSchema.safeParse(site).success).toBe(false);
  });

  it('impose un hero en tête, un seul pied de page en dernier et la page « index » en premier', () => {
    const site = structuredClone(siteSchema.parse(samples[0].site));
    site.pages[0].sections.reverse();
    expect(siteSchema.safeParse(site).success).toBe(false);
    const renamed = structuredClone(siteSchema.parse(samples[0].site));
    renamed.pages[0].slug = 'accueil';
    expect(siteSchema.safeParse(renamed).success).toBe(false);
  });
});

describe('rendu statique', () => {
  const rendered = samples.map((sample) => ({ sample, output: renderSite(siteSchema.parse(sample.site)) }));

  it('produit un HTML valide, une feuille de style compilée et aucune dépendance externe', () => {
    for (const { sample, output } of rendered) {
      const html = output.files['index.html'];
      expect(structureIssues(html), sample.id).toBe(0);
      expect(html).toContain('<link rel="stylesheet" href="styles.css">');
      const css = output.files['styles.css'];
      expect(css.length, `${sample.id} : taille du CSS`).toBeLessThan(26_000);
      expect(`${html}${css}`).not.toMatch(/cdn\.tailwindcss|googleapis|gstatic|<script/i);
      expect(css).not.toMatch(/url\((?!\/fonts\/)/);
    }
  });

  it('charge au plus deux polices auto-hébergées', () => {
    for (const { output } of rendered) expect((output.files['styles.css'].match(/@font-face/g) ?? []).length).toBeLessThanOrEqual(2);
  });

  it('n’utilise que des jetons {{company.*}} connus et les remplace tous', () => {
    for (const { sample, output } of rendered) {
      const html = output.files['index.html'];
      const keys = [...html.matchAll(/\{\{company\.(\w+)\}\}/g)].map((match) => match[1]);
      expect(keys.every((key) => ['name', 'activity', 'address', 'email', 'phone', 'city'].includes(key)), sample.id).toBe(true);
      const injected = injectCompanyData(html, { ...sample.company, missingFields: {} });
      expect(injected).not.toContain('{{company');
      expect(injected).toContain(sample.company.name);
    }
  });

  it('échappe tout texte venant du modèle', () => {
    const site = structuredClone(siteSchema.parse(samples[0].site));
    (site.pages[0].sections[0] as { title: string }).title = '<img src=x onerror=alert(1)> & "guillemets"';
    const html = renderSite(site).files['index.html'];
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;guillemets&quot;');
  });

  it('prévoit titre, description, texte alternatif, lien d’évitement et un seul h1', () => {
    for (const { output } of rendered) {
      const html = output.files['index.html'];
      expect(html).toMatch(/<title>[^<]{10,}<\/title>/);
      expect(html).toMatch(/<meta name="description" content="[^"]{50,}">/);
      expect(html).toContain('class="skip"');
      expect((html.match(/<h1[ >]/g) ?? []).length).toBe(1);
      expect(html).not.toMatch(/<img(?![^>]*\balt=)/);
    }
  });

  it('rend toutes les sections de chaque catalogue sans HTML cassé', () => {
    for (const style of styleIds) {
      for (const type of sectionTypes) {
        const output = renderSite(catalogueSite(style, undefined, type));
        expect(structureIssues(output.files['index.html']), `${style}/${type}`).toBe(0);
      }
    }
  });

  it('n’inclut que le CSS des sections utilisées', () => {
    const small = renderSite(catalogueSite('artisan', undefined, 'faq')).files['styles.css'];
    const full = rendered[0].output.files['styles.css'];
    expect(small.length).toBeLessThan(full.length);
    expect(small).toContain('.faq-list');
    expect(small).not.toContain('.gallery-grid');
  });

  it('peut inclure le CSS dans la page pour l’aperçu', () => {
    const output = renderSite(siteSchema.parse(samples[0].site), { inlineCss: true });
    expect(output.files['styles.css']).toBeUndefined();
    expect(output.files['index.html']).toContain('<style>');
  });
});

describe('données entreprise', () => {
  it('déduit la ville de l’adresse', () => {
    expect(cityOf('3 place du Marché, 17000 La Rochelle')).toBe('La Rochelle');
    expect(cityOf('25 boulevard Haussmann, 75009 Paris')).toBe('Paris');
    expect(cityOf('adresse inconnue')).toBe('');
  });

  it('retire le téléphone et l’email absents au lieu d’afficher des liens vides', () => {
    const html = '<ul><li data-company-opt="phone"><a href="tel:{{company.phone}}">{{company.phone}}</a></li><li data-company-opt="email">{{company.email}}</li><li>{{company.address}}</li></ul>';
    const out = injectCompanyData(html, { name: 'A', activity: 'x', address: '1 rue X, 75001 Paris', legalForm: 'EI', email: '', phone: '' });
    expect(out).toBe('<ul><li>1 rue X, 75001 Paris</li></ul>');
  });
});
