import { describe, expect, it } from 'vitest';
import { samples } from './samples';
import { renderSite } from './render';
import { siteSchema, type SiteDescription } from './schema';
import { applyUserPhotos, dropMissingUserPhotos, userPhotoUrl, type UserPhoto } from './user-photos';

const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const site = () => siteSchema.parse(structuredClone(samples.find((sample) => sample.id === 'boulangerie')!.site)) as SiteDescription;
const photos: UserPhoto[] = [
  { id: ID(1), kind: 'logo', alt: '' },
  { id: ID(2), kind: 'shop', alt: 'Notre fournil' },
  { id: ID(3), kind: 'work', alt: '' },
  { id: ID(4), kind: 'work', alt: '' },
  { id: ID(5), kind: 'work', alt: '' },
  { id: ID(6), kind: 'shop', alt: '' },
];

describe('photos de l’utilisateur', () => {
  it('passent avant celles d’Unsplash : logo, en-tête, présentation et galerie', () => {
    const { site: out, report } = applyUserPhotos(site(), photos);
    expect(report).toMatchObject({ logo: true, hero: true, about: true });
    expect(out.brand?.logo?.src).toBe(userPhotoUrl(ID(1)));
    const hero = out.pages[0].sections[0];
    expect(hero.type === 'hero' && hero.image?.src).toBe(userPhotoUrl(ID(2)));
    expect(hero.type === 'hero' && hero.image?.alt).toBe('Notre fournil');
    const gallery = out.pages[0].sections.find((section) => section.type === 'gallery');
    expect(gallery?.type === 'gallery' && gallery.images.map((entry) => entry.image.src)).toEqual([userPhotoUrl(ID(3)), userPhotoUrl(ID(4)), userPhotoUrl(ID(5))]);
  });

  it('est idempotent : rejouer avec la même liste donne le même site', () => {
    const once = applyUserPhotos(site(), photos).site;
    expect(applyUserPhotos(once, photos).site).toEqual(once);
  });

  it('affiche le logo dans l’en-tête et les photos de l’utilisateur sans crédit Unsplash', () => {
    const html = renderSite(applyUserPhotos(site(), photos).site, { inlineCss: true }).files['index.html'];
    expect(html).toContain(`<img src="${userPhotoUrl(ID(1))}" alt="Logo de {{company.name}}"`);
    expect(html).toContain(`src="${userPhotoUrl(ID(2))}"`);
  });

  it('retire du site une photo supprimée : l’emplacement redevient un visuel graphique, jamais une image cassée', () => {
    const applied = applyUserPhotos(site(), photos).site;
    const out = dropMissingUserPhotos(applied, new Set([ID(2), ID(3), ID(4), ID(5)]));
    expect(out.brand?.logo).toBeUndefined();
    expect(JSON.stringify(out)).not.toContain(ID(1));
  });

  it('ne fait rien sans photo', () => {
    const original = site();
    expect(applyUserPhotos(original, []).site).toEqual(original);
  });
});
