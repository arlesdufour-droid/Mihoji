import { siteSchema, type SiteDescription } from './schema';

// Photos envoyées par l'utilisateur (logo, boutique, réalisations) : logique pure, testée.
// Elles sont prioritaires sur Unsplash : elles remplissent d'abord l'en-tête, la présentation et la galerie.

export const photoKinds = ['logo', 'shop', 'work', 'other'] as const;
export type PhotoKind = (typeof photoKinds)[number];
export const photoKindLabels: Record<PhotoKind, string> = { logo: 'Logo', shop: 'Boutique ou atelier', work: 'Réalisation', other: 'Autre photo' };

export type UserPhoto = { id: string; kind: PhotoKind; alt: string };

export const MAX_USER_PHOTOS = 24;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const userPhotoUrl = (id: string) => `/api/site-photos/${id}`;
export const isUserPhotoSrc = (src: string | undefined) => Boolean(src?.startsWith('/api/site-photos/'));

const DEFAULT_ALT: Record<PhotoKind, string> = {
  logo: 'Logo de {{company.name}}',
  shop: 'L’établissement {{company.name}}',
  work: 'Une réalisation de {{company.name}}',
  other: 'Photo de {{company.name}}',
};
const altOf = (photo: UserPhoto) => (photo.alt.trim() || DEFAULT_ALT[photo.kind]).slice(0, 160);

export type ApplyReport = { logo: boolean; hero: boolean; about: boolean; gallery: number };

// Répartit les photos dans les emplacements du site (idempotent : rejouer avec la même liste donne le même site).
export function applyUserPhotos(site: SiteDescription, photos: UserPhoto[]): { site: SiteDescription; report: ApplyReport } {
  const next = structuredClone(site);
  const report: ApplyReport = { logo: false, hero: false, about: false, gallery: 0 };
  const logo = photos.find((photo) => photo.kind === 'logo');
  if (logo) {
    next.brand = { ...next.brand, logo: { src: userPhotoUrl(logo.id), alt: altOf(logo).slice(0, 120) } };
    report.logo = true;
  }
  const pictures = photos.filter((photo) => photo.kind !== 'logo');
  const pool = [...pictures.filter((photo) => photo.kind === 'shop'), ...pictures.filter((photo) => photo.kind === 'work'), ...pictures.filter((photo) => photo.kind === 'other')];
  const take = (order: PhotoKind[]): UserPhoto | undefined => {
    for (const kind of order) {
      const index = pool.findIndex((photo) => photo.kind === kind);
      if (index >= 0) return pool.splice(index, 1)[0];
    }
    return undefined;
  };
  const image = (photo: UserPhoto) => ({ src: userPhotoUrl(photo.id), alt: altOf(photo) });
  const page = next.pages[0];
  const hero = page.sections.find((section) => section.type === 'hero');
  if (hero) {
    const photo = take(['shop', 'work', 'other']);
    if (photo) { hero.image = image(photo); report.hero = true; }
  }
  const about = page.sections.find((section) => section.type === 'about');
  if (about) {
    // Une réalisation ne sert à la présentation que s'il en reste au moins 3 pour la galerie.
    const worksLeft = pool.filter((entry) => entry.kind === 'work').length;
    const photo = take(worksLeft > 3 ? ['shop', 'other', 'work'] : ['shop', 'other']);
    if (photo) { about.image = image(photo); report.about = true; }
  }
  // Galerie : les réalisations d'abord. Au moins 3 photos de l'utilisateur la remplacent ; sinon elles passent en tête de l'existante.
  const gallery = page.sections.find((section) => section.type === 'gallery');
  const rest = [...pool.filter((photo) => photo.kind === 'work'), ...pool.filter((photo) => photo.kind !== 'work')].slice(0, 9);
  if (rest.length >= 3 || (gallery && rest.length > 0)) {
    const entries = rest.map((photo) => ({ image: image(photo) }));
    if (gallery && rest.length >= 3) gallery.images = entries;
    else if (gallery) gallery.images = [...entries, ...gallery.images.slice(entries.length)].slice(0, 9);
    else {
      const contactAt = page.sections.findIndex((section) => section.type === 'contact' || section.type === 'cta' || section.type === 'map' || section.type === 'footer');
      page.sections.splice(contactAt < 0 ? page.sections.length : contactAt, 0, { type: 'gallery', variant: 'grid', title: 'Nos réalisations', images: entries });
    }
    report.gallery = entries.length;
  }
  return { site: siteSchema.parse(next), report };
}

// Retire du site les photos de l'utilisateur qui n'existent plus (supprimées) : l'emplacement redevient un visuel graphique.
export function dropMissingUserPhotos(site: SiteDescription, existingIds: Set<string>): SiteDescription {
  const next = structuredClone(site);
  const missing = (src: string | undefined) => isUserPhotoSrc(src) && !existingIds.has((src as string).split('/').pop() as string);
  if (next.brand?.logo && missing(next.brand.logo.src)) delete next.brand.logo;
  const walk = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (typeof record.src === 'string' && typeof record.alt === 'string' && missing(record.src)) delete record.src;
      else Object.values(record).forEach(walk);
    }
  };
  walk(next.pages);
  return siteSchema.parse(next);
}
