import { z } from 'zod';
import { iconNames } from './icons';
import { activeModules, displayModules, modulesSchema } from './modules';

export const styleIds = ['artisan', 'moderne', 'premium', 'dynamique'] as const;
export type StyleId = (typeof styleIds)[number];

// Textes bruts uniquement : jamais de HTML. Le rendu échappe tout ; seuls les jetons {{company.*}} sont remplacés ensuite.
const text = (max: number) => z.string().trim().min(1).max(max);

const SAFE_HREF = /^(#[a-z][\w-]*|\/[^\s"'<>]*|tel:(\+?[\d\s.()-]+|\{\{company\.phone\}\})|mailto:[^\s"'<>]+|https:\/\/[^\s"'<>]+)$/i;
const SAFE_IMAGE = /^(\/[^\s"'<>]*|https:\/\/[^\s"'<>]+)$/i;

export const hrefSchema = z.string().trim().max(400).regex(SAFE_HREF, 'lien non autorisé (https, #ancre, /chemin, tel: ou mailto: uniquement)');

export const imageSchema = z.object({
  // Requête de recherche de photo (fournisseur d'images) et/ou adresse d'une image déjà choisie.
  query: text(120).optional(),
  src: z.string().trim().max(600).regex(SAFE_IMAGE, 'image non autorisée').optional(),
  alt: text(160),
  credit: z.object({ name: text(80), url: z.string().trim().url().max(400).regex(/^https:\/\//) }).optional(),
});
export type SiteImage = z.infer<typeof imageSchema>;

export const ctaSchema = z.object({ label: text(40), href: hrefSchema });
export type Cta = z.infer<typeof ctaSchema>;

const common = {
  id: z.string().regex(/^[a-z][a-z0-9-]{0,40}$/).optional(),
  // Libellé dans le menu ; false pour ne pas apparaître dans la navigation.
  nav: z.union([z.literal(false), text(24)]).optional(),
  tone: z.enum(['default', 'alt', 'inverse']).optional(),
};

// Variantes de chaque type de section (source unique pour le rendu, les tests, la galerie et les consignes données au modèle).
export const sectionVariants = {
  hero: ['photo', 'split', 'centered'],
  about: ['image-left', 'image-right', 'text'],
  services: ['cards', 'list', 'icons'],
  products: ['grid', 'menu', 'featured'],
  gallery: ['grid', 'masonry', 'scroll'],
  testimonials: ['cards', 'quote', 'list'],
  stats: ['row', 'cards'],
  hours: ['table', 'card'],
  area: ['chips', 'columns'],
  faq: ['accordion', 'columns'],
  team: ['cards', 'list'],
  cta: ['banner', 'card', 'minimal'],
  contact: ['split', 'centered', 'details'],
  map: ['card', 'split'],
  footer: ['simple', 'columns'],
  // Section d'un module fonctionnel (devis, rendez-vous, boutique…) : son contenu vient de site.modules.
  module: ['panel', 'split'],
} as const;

const eyebrow = text(60).optional();
const intro = text(320).optional();

export const heroSchema = z.object({
  ...common,
  type: z.literal('hero'),
  variant: z.enum(sectionVariants.hero).default('photo'),
  eyebrow,
  title: text(110),
  subtitle: text(280).optional(),
  cta: ctaSchema.optional(),
  secondaryCta: ctaSchema.optional(),
  highlights: z.array(text(44)).max(4).optional(),
  image: imageSchema.optional(),
});

export const aboutSchema = z.object({
  ...common,
  type: z.literal('about'),
  variant: z.enum(sectionVariants.about).default('image-right'),
  eyebrow,
  title: text(100),
  paragraphs: z.array(text(640)).min(1).max(3),
  highlights: z.array(text(90)).max(4).optional(),
  image: imageSchema.optional(),
});

export const servicesSchema = z.object({
  ...common,
  type: z.literal('services'),
  variant: z.enum(sectionVariants.services).default('cards'),
  eyebrow,
  title: text(100),
  intro,
  items: z.array(z.object({ title: text(60), description: text(240), icon: z.enum(iconNames).optional(), price: text(40).optional() })).min(2).max(8),
});

export const productsSchema = z.object({
  ...common,
  type: z.literal('products'),
  variant: z.enum(sectionVariants.products).default('grid'),
  eyebrow,
  title: text(100),
  intro,
  items: z.array(z.object({ name: text(60), description: text(170).optional(), price: text(30).optional(), tag: text(24).optional(), image: imageSchema.optional() })).min(2).max(9),
});

export const gallerySchema = z.object({
  ...common,
  type: z.literal('gallery'),
  variant: z.enum(sectionVariants.gallery).default('grid'),
  eyebrow,
  title: text(100).optional(),
  intro,
  images: z.array(z.object({ image: imageSchema, caption: text(90).optional() })).min(3).max(9),
});

export const testimonialsSchema = z.object({
  ...common,
  type: z.literal('testimonials'),
  variant: z.enum(sectionVariants.testimonials).default('cards'),
  eyebrow,
  title: text(100),
  items: z.array(z.object({ quote: text(340), author: text(60), role: text(70).optional(), rating: z.number().int().min(1).max(5).optional() })).min(1).max(6),
});

export const statsSchema = z.object({
  ...common,
  type: z.literal('stats'),
  variant: z.enum(sectionVariants.stats).default('row'),
  eyebrow,
  title: text(100).optional(),
  items: z.array(z.object({ value: text(14), label: text(50) })).min(2).max(4),
});

export const hoursSchema = z.object({
  ...common,
  type: z.literal('hours'),
  variant: z.enum(sectionVariants.hours).default('table'),
  eyebrow,
  title: text(80),
  intro,
  rows: z.array(z.object({ day: text(30), hours: text(40) })).min(1).max(7),
  note: text(170).optional(),
});

export const areaSchema = z.object({
  ...common,
  type: z.literal('area'),
  variant: z.enum(sectionVariants.area).default('chips'),
  eyebrow,
  title: text(100),
  intro,
  places: z.array(text(40)).min(3).max(24),
  note: text(170).optional(),
});

export const faqSchema = z.object({
  ...common,
  type: z.literal('faq'),
  variant: z.enum(sectionVariants.faq).default('accordion'),
  eyebrow,
  title: text(100),
  intro,
  items: z.array(z.object({ question: text(150), answer: text(520) })).min(3).max(8),
});

export const teamSchema = z.object({
  ...common,
  type: z.literal('team'),
  variant: z.enum(sectionVariants.team).default('cards'),
  eyebrow,
  title: text(100),
  intro,
  members: z.array(z.object({ name: text(60), role: text(70), bio: text(280).optional(), image: imageSchema.optional() })).min(1).max(6),
});

export const ctaSectionSchema = z.object({
  ...common,
  type: z.literal('cta'),
  variant: z.enum(sectionVariants.cta).default('banner'),
  title: text(110),
  text: text(260).optional(),
  button: ctaSchema,
  secondary: ctaSchema.optional(),
});

export const contactSchema = z.object({
  ...common,
  type: z.literal('contact'),
  variant: z.enum(sectionVariants.contact).default('split'),
  mode: z.enum(['contact', 'quote']).default('contact'),
  eyebrow,
  title: text(100),
  intro,
  // Prestations proposées dans la liste déroulante du formulaire de devis.
  services: z.array(text(60)).max(8).optional(),
  submitLabel: text(30).optional(),
});

export const mapSchema = z.object({
  ...common,
  type: z.literal('map'),
  variant: z.enum(sectionVariants.map).default('card'),
  eyebrow,
  title: text(100),
  intro,
  access: z.array(text(120)).max(4).optional(),
});

export const footerSchema = z.object({
  ...common,
  type: z.literal('footer'),
  variant: z.enum(sectionVariants.footer).default('columns'),
  tagline: text(170).optional(),
  links: z.array(z.object({ label: text(40), href: hrefSchema })).max(6).optional(),
});

export const moduleSectionSchema = z.object({
  ...common,
  type: z.literal('module'),
  variant: z.enum(sectionVariants.module).default('panel'),
  module: z.enum(displayModules),
  eyebrow,
  title: text(100),
  intro,
});

export const sectionSchema = z.discriminatedUnion('type', [
  heroSchema, aboutSchema, servicesSchema, productsSchema, gallerySchema, testimonialsSchema, statsSchema, hoursSchema,
  areaSchema, faqSchema, teamSchema, ctaSectionSchema, contactSchema, mapSchema, footerSchema, moduleSectionSchema,
]);

export type Section = z.infer<typeof sectionSchema>;
export type SectionType = Section['type'];
export const sectionTypes = ['hero', 'about', 'services', 'products', 'gallery', 'testimonials', 'stats', 'hours', 'area', 'faq', 'team', 'cta', 'contact', 'map', 'footer', 'module'] as const satisfies readonly SectionType[];

// Aucun texte de remplissage : un site qui en contient est refusé, pas publié.
const FILLER = /lorem ipsum|dolor sit amet|consectetur adipiscing|texte (?:à venir|de remplissage|d['’]exemple)|à (?:compléter|définir|personnaliser|remplacer)|(?:^|\s)x{3,}(?:\s|$)|\bvotre texte\b|\binsérez? (?:ici|votre)\b|\bnom du (?:service|produit|client)\b|\bdescription (?:du|de la) (?:service|produit|prestation)\b|\btitre (?:du|de la) (?:service|section|produit)\b|\bprénom nom\b|\b(?:service|produit|prestation|témoignage|question) (?:n°\s?)?[0-9]\b/i;

export function collectStrings(value: unknown, path = '$'): { path: string; text: string }[] {
  if (typeof value === 'string') return [{ path, text: value }];
  if (Array.isArray(value)) return value.flatMap((item, index) => collectStrings(item, `${path}[${index}]`));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => collectStrings(item, `${path}.${key}`));
  return [];
}

export function findFiller(value: unknown): { path: string; text: string }[] {
  return collectStrings(value).filter((entry) => FILLER.test(entry.text));
}

const pageSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(40),
  title: text(60),
  description: text(170).optional(),
  sections: z.array(sectionSchema).min(1).max(16),
});

export const siteSchema = z.object({
  version: z.literal(1).default(1),
  theme: z.object({ style: z.enum(styleIds), palette: z.string().regex(/^[a-z-]+$/).optional() }),
  seo: z.object({ title: text(70), description: text(170) }),
  // Seul appel à l'action principal du site : bouton de l'en-tête et de l'écran d'accueil.
  primaryCta: ctaSchema,
  pages: z.array(pageSchema).min(1).max(6),
  // Modules fonctionnels proposés pour ce site (voir modules.ts).
  modules: modulesSchema.optional(),
}).superRefine((site, context) => {
  if (site.pages[0].slug !== 'index') context.addIssue({ code: 'custom', path: ['pages', 0, 'slug'], message: 'la première page doit avoir le slug « index »' });
  if (new Set(site.pages.map((page) => page.slug)).size !== site.pages.length) context.addIssue({ code: 'custom', path: ['pages'], message: 'slugs de pages en double' });
  site.pages.forEach((page, pageIndex) => {
    page.sections.forEach((section, index) => {
      if (section.type === 'hero' && index !== 0) context.addIssue({ code: 'custom', path: ['pages', pageIndex, 'sections', index], message: 'le bandeau d’accueil (hero) doit être la première section' });
      if (section.type === 'footer' && index !== page.sections.length - 1) context.addIssue({ code: 'custom', path: ['pages', pageIndex, 'sections', index], message: 'le pied de page doit être la dernière section' });
    });
    for (const type of ['hero', 'footer', 'contact', 'map'] as const) {
      if (page.sections.filter((section) => section.type === type).length > 1) context.addIssue({ code: 'custom', path: ['pages', pageIndex, 'sections'], message: `une seule section « ${type} » par page` });
    }
  });
  // Chaque section de module renvoie à un module configuré, et chaque module affichable a sa section.
  const configured = new Set(activeModules(site.modules));
  const shown = new Set<string>();
  site.pages.forEach((page, pageIndex) => page.sections.forEach((section, index) => {
    if (section.type !== 'module') return;
    if (!configured.has(section.module)) context.addIssue({ code: 'custom', path: ['pages', pageIndex, 'sections', index, 'module'], message: `la section affiche le module « ${section.module} », absent de site.modules` });
    if (shown.has(section.module)) context.addIssue({ code: 'custom', path: ['pages', pageIndex, 'sections', index, 'module'], message: `module « ${section.module} » affiché deux fois` });
    shown.add(section.module);
  }));
  for (const key of displayModules) {
    if (configured.has(key) && !shown.has(key)) context.addIssue({ code: 'custom', path: ['modules', key], message: `le module « ${key} » doit avoir sa section (type « module »)` });
  }
  for (const entry of findFiller(site)) context.addIssue({ code: 'custom', path: [entry.path], message: `texte de remplissage interdit : « ${entry.text.slice(0, 60)} »` });
});

export type SiteDescription = z.infer<typeof siteSchema>;
export type SiteInput = z.input<typeof siteSchema>;
