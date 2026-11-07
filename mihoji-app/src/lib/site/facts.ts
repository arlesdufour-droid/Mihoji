import { z } from 'zod';
import { collectStrings, siteSchema, type InviteKind, type SiteDescription } from './schema';

// Vraies données de l'entreprise et garde-fous de crédibilité (logique pure, testée).
// Règle : un site n'affiche ni avis, ni chiffres, ni horaires, ni certifications qui ne viennent pas de l'entreprise.
// Le modèle reçoit uniquement des faits vérifiables ; tout ce qu'il invente malgré les consignes est refusé ou retiré.

// Réponses de l'onboarding (colonne companies.profile). Toutes facultatives, en texte libre court.
export const profileSchema = z.object({
  specialties: z.string().trim().max(400).optional(),
  distinction: z.string().trim().max(400).optional(),
  hours: z.string().trim().max(300).optional(),
}).strict();
export type CompanyProfile = z.infer<typeof profileSchema>;

export function parseProfile(value: unknown): CompanyProfile {
  const parsed = profileSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  // Valeur ancienne ou partiellement invalide : on garde les champs textuels connus.
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const pick = (key: string) => (typeof record[key] === 'string' ? (record[key] as string).trim().slice(0, 400) || undefined : undefined);
  return { specialties: pick('specialties'), distinction: pick('distinction'), hours: pick('hours') };
}

export type SiteFacts = {
  /** Année de création, seulement si elle vient d'une source officielle (Sirene), jamais d'une saisie manuelle. */
  foundedYear?: number;
  city?: string;
  /** Zone d'intervention fournie par l'utilisateur ou déduite de la ville (communes voisines). */
  specialties?: string;
  distinction?: string;
  hours?: string;
  /** Texte libre fourni par l'utilisateur dans cette demande (sert à autoriser ses propres chiffres et labels). */
  userText?: string;
};

export function foundedYearOf(company: { siret?: string | null; createdAt?: Date | string | null }, now = new Date()): number | undefined {
  if (!company.siret || !company.createdAt) return undefined;
  const year = new Date(company.createdAt).getUTCFullYear();
  return Number.isFinite(year) && year >= 1900 && year < now.getUTCFullYear() ? year : undefined;
}

export function factsOf(input: { company: { siret?: string | null; createdAt?: Date | string | null; address?: string }; profile?: unknown; request?: string; city?: string }, now = new Date()): SiteFacts {
  const profile = parseProfile(input.profile);
  return {
    foundedYear: foundedYearOf(input.company, now),
    city: input.city,
    specialties: profile.specialties || undefined,
    distinction: profile.distinction || undefined,
    hours: profile.hours || undefined,
    userText: [input.request, profile.specialties, profile.distinction, profile.hours].filter(Boolean).join(' \n '),
  };
}

// Lignes de faits injectées dans le message envoyé au modèle.
export function factsLines(facts: SiteFacts, now = new Date()): string[] {
  const lines: string[] = [];
  if (facts.foundedYear) lines.push(`- Année de création (source officielle) : ${facts.foundedYear} — environ ${now.getUTCFullYear() - facts.foundedYear} ans d'existence ; tu peux l'utiliser (« depuis ${facts.foundedYear} »).`);
  if (facts.specialties) lines.push(`- Spécialités indiquées par le client : ${facts.specialties}`);
  if (facts.distinction) lines.push(`- Ce qui distingue l'entreprise (mots du client, à reformuler sans rien ajouter) : ${facts.distinction}`);
  lines.push(facts.hours ? `- Horaires fournis par le client (à reprendre tels quels dans une section "hours") : ${facts.hours}` : '- Horaires : NON FOURNIS (aucune section "hours", ne donne aucun horaire)');
  return lines;
}

const digits = (text: string) => text.match(/\d+/g) ?? [];

// Nombres que le site a le droit d'afficher en chiffres clés : année de création, ancienneté, et nombres écrits par l'utilisateur.
export function allowedNumbers(facts: SiteFacts, now = new Date()): Set<string> {
  const allowed = new Set<string>(digits(facts.userText ?? ''));
  if (facts.foundedYear) {
    allowed.add(String(facts.foundedYear));
    allowed.add(String(now.getUTCFullYear() - facts.foundedYear));
  }
  return allowed;
}

const CERTIFICATIONS = /\b(certifi\w*|label(?:lis\w*)?|qualibat|qualiopi|ecocert|rge|iso\s?\d{4,5}|meilleur ouvrier|mof|m[ée]daill\w*|r[ée]compens\w*|prim[ée]e?s?|agr[ée]{1,2}\w*|n[°o]\s?1 (?:de|en|du))\b/gi;
// Chiffre suivi d'un nom de quantité (clients, ans…) : un chiffre de preuve sociale ou d'expérience.
const FIGURE = /(\d[\d  .,]*)\s*(?:\+\s*)?(ans?|années?|clients?|chantiers?|r[ée]alisations?|projets?|avis|interventions?|mariages?|patients?|couverts|entreprises?|familles?|étoiles?)/gi;
// Pourcentage de satisfaction ou de réussite (un taux de remboursement ou une TVA reste libre).
const RATE = /(\d[\d,.]*)\s*%\s*(?:de\s+|des\s+)?(?:clients?|satisf\w*|r[ée]ussite|recommand\w*|patients?)/gi;
const SINCE = /\b(?:depuis|fond[ée]e? en|cr[ée][ée]e? en|en activit[ée] depuis)\s+(\d{4})\b/gi;

function isAllowedNumber(raw: string, allowed: Set<string>): boolean {
  return digits(raw).every((value) => allowed.has(value));
}

// Problèmes textuels que seul le modèle peut corriger (il reçoit la liste et réécrit).
export function credibilityIssues(site: SiteDescription, facts: SiteFacts, now = new Date()): string[] {
  const issues: string[] = [];
  const allowed = allowedNumbers(facts, now);
  const user = (facts.userText ?? '').toLowerCase();
  const seen = new Set<string>();
  for (const { path, text } of collectStrings(site.pages)) {
    if (/\.(?:query|alt|src)$/.test(path)) continue;
    for (const match of text.matchAll(CERTIFICATIONS)) {
      // Fourni par le client si son texte contient le mot ou sa racine (« certifiés » autorise « certifié »).
      const word = match[0].toLowerCase();
      if (!user.includes(word) && !user.includes(word.slice(0, Math.max(5, word.length - 2)))) seen.add(`${path} : « ${match[0]} » (certification, label ou récompense non fournis par le client)`);
    }
    for (const match of text.matchAll(FIGURE)) {
      if (!isAllowedNumber(match[1], allowed)) seen.add(`${path} : « ${match[0].trim()} » (chiffre non fourni par le client)`);
    }
    for (const match of text.matchAll(RATE)) {
      if (!isAllowedNumber(match[1], allowed)) seen.add(`${path} : « ${match[0].trim()} » (taux non fourni par le client)`);
    }
    for (const match of text.matchAll(SINCE)) {
      if (!allowed.has(match[1])) seen.add(`${path} : « ${match[0]} » (année non fournie)`);
    }
  }
  issues.push(...seen);
  return issues.slice(0, 12);
}

export type EnforceReport = { removed: ('testimonials' | 'stats' | 'hours')[] };

// Retire les sections qui exigent des données réelles absentes (avis, chiffres sans source, horaires non fournis) et
// laisse à la place un emplacement visible seulement dans le Studio. Les sections valides sont conservées telles quelles.
export function enforceRealData(site: SiteDescription, facts: SiteFacts, now = new Date()): { site: SiteDescription; report: EnforceReport } {
  const next = structuredClone(site);
  const allowed = allowedNumbers(facts, now);
  const removed = new Set<EnforceReport['removed'][number]>();
  for (const page of next.pages) {
    const kept: typeof page.sections = [];
    for (const section of page.sections) {
      if (section.type === 'testimonials') { removed.add('testimonials'); continue; }
      if (section.type === 'hours' && !facts.hours) { removed.add('hours'); continue; }
      if (section.type === 'stats') {
        section.items = section.items.filter((item) => isAllowedNumber(item.value, allowed) && digits(item.value).length > 0);
        if (section.items.length < 2) { removed.add('stats'); continue; }
      }
      kept.push(section);
    }
    page.sections = kept;
  }
  return { site: siteSchema.parse(withInvites(next, removed)), report: { removed: [...removed] } };
}

const INVITE_BEFORE: Record<InviteKind, 'faq' | 'cta' | 'map'> = { testimonials: 'faq', stats: 'cta', hours: 'map' };

// Emplacements « à compléter » de la page d'accueil : avis et chiffres clés tant qu'ils n'existent pas, horaires s'ils ont été retirés.
export function withInvites(site: SiteDescription, removed: Set<string> = new Set()): SiteDescription {
  const page = site.pages[0];
  const has = (type: string) => page.sections.some((section) => section.type === type);
  const kinds: InviteKind[] = [];
  if (!has('testimonials')) kinds.push('testimonials');
  if (!has('stats')) kinds.push('stats');
  if (!has('hours') && removed.has('hours')) kinds.push('hours');
  page.invites = kinds.map((kind) => ({ kind, before: INVITE_BEFORE[kind] }));
  if (page.invites.length === 0) delete page.invites;
  return site;
}
