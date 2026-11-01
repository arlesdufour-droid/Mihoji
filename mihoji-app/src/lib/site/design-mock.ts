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
