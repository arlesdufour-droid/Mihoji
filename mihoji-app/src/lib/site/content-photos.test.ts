import { describe, expect, it } from 'vitest';
import { applyPhotoRules } from '../photos/rules';
import { placeGalleries } from './compositions';
import { renderSite } from './render';
import { samples } from './samples';
import { siteSchema, type Section, type SiteDescription } from './schema';

// Lot 7, étape 1 : les photos servent le contenu (une par prestation, galerie justifiée et placée haut).
const base = () => siteSchema.parse((samples.find((sample) => JSON.stringify(sample.site).includes('"type":"services"')) ?? samples[0]).site);
const withGallery = (site: SiteDescription, at: number): SiteDescription => {
  const sections: Section[] = site.pages[0].sections.filter((section) => section.type !== 'gallery');
  const gallery: Section = { type: 'gallery', variant: 'grid', images: [1, 2, 3].map((n) => ({ image: { query: `q${n}`, src: `https://images.example.com/${n}.jpg`, alt: `photo ${n}` } })) };
  sections.splice(at, 0, gallery);
  return { ...site, pages: [{ ...site.pages[0], sections }] };
};
const galleries = (site: SiteDescription) => site.pages[0].sections.filter((section) => section.type === 'gallery').length;

describe('galerie justifiée', () => {
  it('est retirée pour un praticien (coach, kiné, avocat…)', () => {
    expect(galleries(placeGalleries(withGallery(base(), 6), 'praticien'))).toBe(0);
  });
  it('est gardée pour un artisan, un photographe, un restaurant ou un commerce', () => {
    for (const family of ['artisan', 'photographe', 'restaurant', 'commerce'] as const) expect(galleries(placeGalleries(withGallery(base(), 6), family)), family).toBe(1);
  });
  it('métier inconnu : gardée en haut de page, retirée si elle est posée en bas', () => {
    expect(galleries(placeGalleries(withGallery(base(), 2), undefined))).toBe(1);
    expect(galleries(placeGalleries(withGallery(base(), 7), undefined))).toBe(0);
  });
});

describe('une photo par prestation', () => {
  const services = (site: SiteDescription) => site.pages[0].sections.find((section) => section.type === 'services')!;
  const withServicePhotos = (count: number): SiteDescription => {
    const site = base();
    const section = services(site);
    if (section.type !== 'services') throw new Error('services attendu');
    section.items = section.items.map((item, index) => (index < count ? { ...item, image: { query: `plumber repairing kitchen tap ${["sink","pipe","boiler","bathroom","radiator","heater","valve","drain"][index % 8]}`, src: `https://images.example.com/s${index}.jpg`, alt: `Photo ${item.title}` } } : item));
    return site;
  };
  it('affiche la photo en tête de chaque carte quand toutes les prestations en ont une', () => {
    const site = withServicePhotos(99);
    const ruled = applyPhotoRules(site).site;
    const html = renderSite(ruled).files['index.html'];
    const section = services(ruled);
    if (section.type !== 'services') throw new Error();
    expect((html.match(/class="media-box svc-photo"/g) ?? []).length).toBe(section.items.length);
    expect(html).toContain('svc-item--photo');
  });
  it('retire toutes les photos de prestation si une seule manque (pas de cartes mêlant photos et cadres vides)', () => {
    const ruled = applyPhotoRules(withServicePhotos(1)).site;
    const section = services(ruled);
    if (section.type !== 'services') throw new Error();
    expect(section.items.every((item) => !item.image)).toBe(true);
    expect(renderSite(ruled).files['index.html']).not.toContain('svc-item--photo');
  });
});
