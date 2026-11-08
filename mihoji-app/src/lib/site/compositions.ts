import type { Section, SiteDescription } from './schema';

// Compositions propres à chaque famille de métiers (phase Q, lot Q3) : l'ordre des sections raconte le métier.
// Logique pure : le modèle reçoit ces consignes dans son prompt, et l'ordre est de toute façon garanti ici après la génération.
// Le bandeau d'accueil reste en premier, le pied de page en dernier ; les sections non listées gardent leur ordre relatif, après les listées.

export const tradeFamilies = ['restaurant', 'artisan', 'praticien', 'photographe', 'commerce'] as const;
export type TradeFamily = (typeof tradeFamilies)[number];

const KEYWORDS: Record<TradeFamily, RegExp> = {
  photographe: /photograph|portrait|mariage|vid[ée]aste|graphiste|illustrat/,
  restaurant: /restaura|bistrot|brasserie|pizzeria|traiteur|caf[ée]\b|\bbar\b|cr[êe]perie|cuisine|gastronom/,
  praticien: /kin[ée]sith|ost[ée]opath|m[ée]decin|dentiste|psycholog|th[ée]rapeut|coach|naturopath|infirmi|orthophon|diététicien|dieteticien|avocat|notaire|conseil|consultant|coiffeu|esth[ée]ti|massage|yoga|pilates|r[ée][ée]ducation|sant[ée]|juridi/,
  artisan: /plomb|[ée]lectric|menuis|ma[çc]on|peintre|couvr|chauffag|garage|m[ée]canic|carross|serrur|paysag|jardin|carrel|travaux|b[âa]timent|d[ée]pannage|installation|r[ée]novation|entretien et r[ée]paration/,
  commerce: /boulang|p[âa]tiss|boucher|charcut|fromag|fleur|[ée]picerie|cave\b|\bvins?\b|librairie|boutique|magasin|commerce|d[ée]tail|primeur|chocolat|bijou/,
};

const ORDER: TradeFamily[] = ['photographe', 'restaurant', 'praticien', 'artisan', 'commerce'];

function plain(value: string): string {
  return value.toLowerCase();
}

// Famille déduite du métier, de l'activité déclarée puis de la demande (le métier explicite l'emporte sur la demande).
export function tradeFamilyOf(input: { trade?: string; activity?: string; request?: string }): TradeFamily | undefined {
  for (const text of [input.trade, input.activity, input.request]) {
    if (!text) continue;
    const lowered = plain(text);
    const family = ORDER.find((candidate) => KEYWORDS[candidate].test(lowered));
    if (family) return family;
  }
  return undefined;
}

// Ordre d'apparition après le bandeau d'accueil. « module:x » désigne la section du module x.
export const compositions: Record<TradeFamily, string[]> = {
  restaurant: ['products', 'module:booking', 'gallery', 'about', 'hours', 'testimonials', 'faq', 'contact', 'map', 'cta'],
  artisan: ['gallery', 'module:quote', 'services', 'about', 'area', 'stats', 'testimonials', 'faq', 'contact', 'map', 'cta'],
  praticien: ['services', 'module:booking', 'about', 'team', 'faq', 'hours', 'testimonials', 'contact', 'map', 'cta'],
  photographe: ['gallery', 'services', 'module:booking', 'module:quote', 'about', 'testimonials', 'contact', 'cta', 'map'],
  commerce: ['products', 'module:shop', 'module:payment', 'about', 'gallery', 'hours', 'testimonials', 'map', 'contact', 'cta'],
};

// Consignes de composition données au modèle (une ligne par famille).
export const compositionGuide = [
  '- restaurant (restaurant, bistrot, traiteur…) : la carte (products, variante "menu") puis la réservation (module booking) viennent en premier, avant la présentation.',
  '- artisan (plombier, électricien, garage, menuisier…) : les réalisations (gallery) puis la demande de devis (module quote) tôt dans la page, avant la présentation.',
  '- praticien (kiné, coach, avocat, consultant, coiffeur…) : les prestations (services) puis la prise de rendez-vous (module booking), puis la présentation du praticien.',
  '- photographe (photographe, vidéaste, graphiste…) : le portfolio (gallery) juste après le bandeau, en grand (variante "masonry"), les forfaits ensuite, puis la demande de disponibilités.',
  '- commerce (boulangerie, fleuriste, épicerie, boutique…) : les produits (products) puis la commande et le click & collect (module shop) en premier.',
].join('\n');

function keyOf(section: Section): string {
  return section.type === 'module' ? `module:${section.module}` : section.type;
}

export function composeForFamily(site: SiteDescription, family: TradeFamily | undefined): SiteDescription {
  if (!family) return site;
  const page = site.pages[0];
  const first = page.sections[0]?.type === 'hero' ? page.sections[0] : undefined;
  const last = page.sections.at(-1)?.type === 'footer' ? page.sections.at(-1) : undefined;
  const body = page.sections.filter((section) => section !== first && section !== last);
  const order = compositions[family];
  const rank = (section: Section) => { const index = order.indexOf(keyOf(section)); return index === -1 ? order.length : index; };
  const sorted = body.map((section, index) => ({ section, index })).sort((a, b) => rank(a.section) - rank(b.section) || a.index - b.index).map((entry) => entry.section);
  const adjusted = sorted.map((section): Section => {
    if (family === 'restaurant' && section.type === 'products' && section.variant === 'grid') return { ...section, variant: 'menu' };
    if (family === 'photographe' && section.type === 'gallery') return { ...section, variant: 'masonry' };
    return section;
  });
  const sections = [...(first ? [first] : []), ...adjusted, ...(last ? [last] : [])];
  return { ...site, pages: [{ ...page, sections }, ...site.pages.slice(1)] };
}

// Les photos servent le contenu (phase Q, lot 7) : une galerie n'est gardée que si le métier a des réalisations à montrer, et placée haut dans la page.
// Praticiens et métiers du conseil (coach, kiné, avocat, consultant) : pas de galerie générique, la présentation porte un portrait et chaque prestation sa photo.
// Métier inconnu : une galerie reste seulement si elle figure parmi les premières sections (jamais « posée » en bas de page).
const GALLERY_FAMILIES: TradeFamily[] = ['artisan', 'photographe', 'restaurant', 'commerce'];
const MAX_GALLERY_RANK = 4; // position maximale (après le bandeau) d'une galerie

export function placeGalleries(site: SiteDescription, family: TradeFamily | undefined): SiteDescription {
  const page = site.pages[0];
  const allowed = family ? GALLERY_FAMILIES.includes(family) : true;
  let removed = false;
  const kept = page.sections.filter((section, index) => {
    if (section.type !== 'gallery') return true;
    if (!allowed || (!family && index > MAX_GALLERY_RANK)) { removed = true; return false; }
    return true;
  });
  if (!removed) return site;
  return { ...site, pages: [{ ...page, sections: kept }, ...site.pages.slice(1)] };
}
