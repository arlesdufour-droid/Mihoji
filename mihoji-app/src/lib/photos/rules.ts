import { siteSchema, type SiteDescription } from '../site/schema';

// Règles d'affichage des photos après attribution (logique pure, testée) :
// - une galerie qui n'a pas au moins 3 bonnes photos est masquée, jamais affichée vide ou à moitié vide ;
// - une grille de produits avec moins de la moitié de photos n'en affiche aucune (pas de cadres vides mêlés à de vraies photos).
export const MIN_GALLERY_PHOTOS = 3;

export function applyPhotoRules(site: SiteDescription): { site: SiteDescription; hiddenGalleries: number } {
  const next = structuredClone(site);
  let hiddenGalleries = 0;
  for (const page of next.pages) {
    page.sections = page.sections.flatMap((section) => {
      if (section.type === 'gallery') {
        const good = section.images.filter((entry) => entry.image.src);
        if (good.length < MIN_GALLERY_PHOTOS) { hiddenGalleries += 1; return []; }
        section.images = good;
      }
      // Sans photo, un bandeau ou une présentation à cadre photo devient une composition typographique (pas de cadre vide).
      if (section.type === 'hero' && !section.image?.src && section.variant !== 'centered') { section.variant = 'centered'; delete section.image; }
      if (section.type === 'about' && !section.image?.src && section.variant !== 'text') { section.variant = 'text'; delete section.image; }
      // Une photo par prestation : toutes ou aucune (jamais de cartes mêlant photos et cadres vides) ; les photos s'affichent en variante « cartes ».
      if (section.type === 'services') {
        const withPhoto = section.items.filter((item) => item.image?.src).length;
        if (withPhoto === section.items.length) section.variant = 'cards';
        else section.items = section.items.map((item) => { const { image, ...rest } = item; void image; return rest; });
      }
      if (section.type === 'products') {
        const withPhoto = section.items.filter((item) => item.image?.src).length;
        if (withPhoto < Math.ceil(section.items.length / 2)) section.items = section.items.map((item) => { const { image, ...rest } = item; void image; return rest; });
        else section.items = section.items.map((item) => (item.image && !item.image.src ? { ...item, image: undefined } : item));
      }
      return [section];
    });
  }
  return { site: siteSchema.parse(next), hiddenGalleries };
}
