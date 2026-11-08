import { RESTYLE_PROMPT_MARKER } from './design-prompt';
import { catalogueModules, samples } from './samples';
import type { SiteModules } from './modules';
import type { SiteInput } from './schema';
import { styles } from './themes';

// Réponses simulées du modèle de design (développement sans clé, tests e2e) : un site d'exemple adapté à la demande,
// avec les modules fonctionnels qu'elle évoque. Jamais utilisé en production (voir designRoute).

const SAMPLE_KEYWORDS: [string, RegExp][] = [
  ['coach', /coach|sport|fitness|musculation/i],
  ['kine', /kin[ée]|ost[ée]o|physio|sant[ée]/i],
  ['avocat', /avocat|juridique|notaire|conseil/i],
  ['boulangerie', /boulang|p[âa]tiss|pain/i],
];

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function mockDesignJson(userMessage: string): string {
  const request = userMessage.match(/Demande du client : « ([\s\S]*?) »/)?.[1] ?? userMessage;
  const plain = normalize(request);
  const sampleId = SAMPLE_KEYWORDS.find(([, pattern]) => pattern.test(plain))?.[0] ?? 'boulangerie';
  const sample = samples.find((candidate) => candidate.id === sampleId)!;
  const site = structuredClone(sample.site) as SiteInput & { modules?: SiteModules };
  const modules: Partial<SiteModules> = {};
  if (/devis|travaux|plomb|depann/.test(plain)) modules.quote = catalogueModules.quote;
  if (/rendez-vous|rdv|reserv|seance/.test(plain)) modules.booking = { ...catalogueModules.booking!, payment: /paiement|payer|acompte/.test(plain) ? 'deposit' : 'none' };
  if (/paiement|payer|acompte|forfait/.test(plain)) modules.payment = catalogueModules.payment;
  if (/click|commande|boutique|retrait/.test(plain)) modules.shop = catalogueModules.shop;
  if (modules.booking && modules.booking.payment === 'none') delete modules.booking.depositPercent;
  const sections = site.pages[0].sections;
  // Comme le vrai modèle (lot 7) : pour un praticien, les photos de la galerie d'exemple deviennent une photo par prestation (la galerie est ensuite retirée).
  if (['coach', 'kine', 'avocat'].includes(sampleId)) {
    const gallery = sections.find((section) => section.type === 'gallery');
    const services = sections.find((section) => section.type === 'services');
    if (gallery && services && gallery.type === 'gallery' && services.type === 'services') services.items = services.items.map((item, index) => (gallery.images[index] ? { ...item, image: { ...gallery.images[index].image, alt: `${item.title}` } } : item));
  }
  const footerIndex = sections.findIndex((section) => section.type === 'footer');
  const anchors: Record<string, string> = { quote: 'Demandez votre devis', booking: 'Réservez en ligne', shop: 'Commandez en click & collect', payment: 'Nos formules' };
  const moduleSections = Object.keys(modules).filter((key) => key in anchors).map((key) => ({ type: 'module' as const, variant: 'panel' as const, module: key as 'quote', title: anchors[key] }));
  sections.splice(footerIndex < 0 ? sections.length : footerIndex, 0, ...moduleSections);
  if (Object.keys(modules).length) {
    site.modules = { ...modules, widgets: [{ type: 'google-maps' }] } as SiteModules;
    const first = modules.booking ? '#reservation' : modules.shop ? '#commande' : modules.quote ? '#devis' : '#tarifs';
    site.primaryCta = { label: modules.booking ? 'Réserver' : modules.shop ? 'Commander' : modules.quote ? 'Demander un devis' : 'Voir les tarifs', href: first };
  }
  return JSON.stringify(site);
}

export function mockRestyleJson(userMessage: string): string {
  const current = userMessage.match(/Style actuel : "([a-z]+)"/)?.[1];
  const asked = styles.find((style) => normalize(userMessage).includes(normalize(style.label.split(' ')[0])) && style.id !== current);
  const next = asked ?? styles[(styles.findIndex((style) => style.id === current) + 1) % styles.length];
  return JSON.stringify({ theme: { style: next.id, palette: next.palettes[0].id }, summary: `J’ai appliqué le style « ${next.label} ».` });
}

export function isRestylePrompt(system: string | undefined): boolean {
  return Boolean(system?.startsWith(RESTYLE_PROMPT_MARKER));
}

// --- Modifications par le chat (simulation) ------------------------------------------------------------------------

const MOCK_REMOVABLE: [RegExp, string][] = [
  [/faq|question/, 'faq'], [/galerie|photos?/, 'gallery'], [/avis|temoignage/, 'testimonials'], [/equipe/, 'team'],
  [/horaire/, 'hours'], [/zone|intervention/, 'area'], [/chiffre/, 'stats'], [/specialite|produit|nos pains/, 'products'],
];

export function mockEditJson(userMessage: string, retried: boolean): string {
  const raw = userMessage.match(/Demande du client : « ([\s\S]*?) »\n/)?.[1] ?? '';
  const plain = normalize(raw);
  const outline = [...userMessage.matchAll(/^(\d+) : (\w+) \(/gm)].map((match) => ({ index: Number(match[1]), type: match[2] }));
  const footer = outline.find((entry) => entry.type === 'footer')?.index ?? outline.length;
  const quoted = raw.match(/[«"“]\s*([^»"”]+?)\s*[»"”]/)?.[1];
  const reply = (summary: string, operations: unknown[]) => JSON.stringify({ summary, operations });

  // Premier essai volontairement défectueux (texte de remplissage) : les contrôles doivent l'annuler, puis le second essai est correct.
  if (/maladroit/.test(plain)) {
    const hero = outline.find((entry) => entry.type === 'hero');
    if (!hero) return reply('Je ne trouve pas l’en-tête du site.', []);
    return retried
      ? reply('J’ai modifié le titre de l’en-tête.', [{ op: 'updateSection', index: hero.index, set: { title: 'Le pain du quartier, chaque matin' } }])
      : reply('J’ai modifié le titre de l’en-tête.', [{ op: 'updateSection', index: hero.index, set: { title: 'Lorem ipsum dolor sit amet' } }]);
  }
  const target = MOCK_REMOVABLE.find(([pattern]) => pattern.test(plain))?.[1];
  if (/supprim|enlev|retir/.test(plain) && target) {
    const entry = outline.find((candidate) => candidate.type === target);
    return entry ? reply('J’ai retiré cette section du site.', [{ op: 'removeSection', index: entry.index }]) : reply('Cette section n’existe pas sur votre site, je n’ai rien changé.', []);
  }
  if (/ajout|insere|cree/.test(plain) && /faq|question/.test(plain)) {
    if (outline.some((entry) => entry.type === 'faq')) return reply('Votre site a déjà une section de questions fréquentes.', []);
    return reply('J’ai ajouté une section de questions fréquentes avant le pied de page.', [{ op: 'insertSection', index: footer, section: {
      type: 'faq', variant: 'accordion', title: 'Vos questions, nos réponses', intro: 'Les questions que l’on nous pose le plus souvent.',
      items: [
        { question: 'Peut-on commander à l’avance ?', answer: 'Oui, appelez-nous ou passez au comptoir : votre commande est prête à l’heure convenue.' },
        { question: 'Où nous trouver ?', answer: 'Toutes les informations d’accès figurent plus bas, avec nos horaires d’ouverture.' },
        { question: 'Proposez-vous des produits adaptés aux allergies ?', answer: 'Dites-nous vos contraintes à la commande, nous vous conseillons les produits adaptés.' },
      ],
    } }]);
  }
  const asked = styles.find((style) => plain.includes(normalize(style.label.split(' ')[0])) || plain.includes(style.id));
  if (/style|ambiance|look|elegant|moderne|colore|chaleureux/.test(plain) && asked) {
    return reply(`J’ai appliqué le style « ${asked.label} ».`, [{ op: 'setTheme', style: asked.id, palette: asked.palettes[0].id }]);
  }
  if (/titre/.test(plain) && quoted) {
    const hero = outline.find((entry) => entry.type === 'hero');
    if (hero) return reply('J’ai modifié le titre de l’en-tête.', [{ op: 'updateSection', index: hero.index, set: { title: quoted } }]);
  }
  return reply('Je n’ai pas bien compris ce que vous souhaitez modifier. Pouvez-vous préciser, par exemple « ajoute une FAQ » ou « supprime la galerie » ?', []);
}
