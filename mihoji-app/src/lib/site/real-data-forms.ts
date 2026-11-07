import { z } from 'zod';
import { siteSchema, type Section, type SiteDescription } from './schema';
import { withInvites } from './facts';

// Formulaires du Studio pour les horaires et les chiffres clés (phase Q, lot Q3) : ces données réelles sont saisies par
// l'entreprise elle-même, sans passer par le chat. Logique pure : insère, remplace ou retire la section, puis recalcule
// les encarts « à compléter ». Le résultat est toujours validé par le schéma du site.

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;

export const hoursFormSchema = z.object({
  rows: z.array(z.object({ day: z.string().trim().min(1).max(30), hours: z.string().trim().max(40) })).max(7),
  note: z.string().trim().max(170).optional(),
});
export type HoursForm = z.infer<typeof hoursFormSchema>;

export const statsFormSchema = z.object({
  items: z.array(z.object({ value: z.string().trim().max(14), label: z.string().trim().max(50) })).max(4),
});
export type StatsForm = z.infer<typeof statsFormSchema>;

type HoursSection = Extract<Section, { type: 'hours' }>;
type StatsSection = Extract<Section, { type: 'stats' }>;

const BEFORE_HOURS = ['map', 'contact', 'footer'] as const;
const BEFORE_STATS = ['cta', 'faq', 'contact', 'footer'] as const;

function insertionIndex(sections: Section[], before: readonly string[]): number {
  for (const type of before) {
    const index = sections.findIndex((section) => section.type === type);
    if (index !== -1) return index;
  }
  return sections.length;
}

function replaceOrInsert(site: SiteDescription, type: 'hours' | 'stats', next: Section | null, before: readonly string[]): SiteDescription {
  const copy = structuredClone(site);
  const page = copy.pages[0];
  const existing = page.sections.findIndex((section) => section.type === type);
  if (existing !== -1) {
    if (next) page.sections[existing] = { ...next, id: page.sections[existing].id, nav: page.sections[existing].nav } as Section;
    else page.sections.splice(existing, 1);
  } else if (next) {
    page.sections.splice(insertionIndex(page.sections, before), 0, next);
  }
  // Sans la donnée, l'encart « à compléter » revient (visible seulement dans le Studio).
  return siteSchema.parse(withInvites(copy, new Set(next ? [] : [type])));
}

export function cleanHours(form: HoursForm): { day: string; hours: string }[] {
  return form.rows.filter((row) => row.hours.length > 0);
}

export function applyHoursForm(site: SiteDescription, form: HoursForm): SiteDescription {
  const rows = cleanHours(form);
  if (rows.length === 0) return replaceOrInsert(site, 'hours', null, BEFORE_HOURS);
  const section: HoursSection = { type: 'hours', variant: 'table', title: 'Horaires d’ouverture', rows, ...(form.note ? { note: form.note } : {}) } as HoursSection;
  const kept = site.pages[0].sections.find((candidate): candidate is HoursSection => candidate.type === 'hours');
  return replaceOrInsert(site, 'hours', kept ? { ...kept, rows, note: form.note || undefined } : section, BEFORE_HOURS);
}

// Texte résumé des horaires, enregistré dans le profil de l'entreprise pour que les futures créations de site les reprennent.
export function hoursSummary(form: HoursForm): string {
  return cleanHours(form).map((row) => `${row.day} ${row.hours}`).join(' ; ').slice(0, 300);
}

export function cleanStats(form: StatsForm): { value: string; label: string }[] {
  return form.items.filter((item) => item.value && item.label);
}

export type StatsResult = { ok: true; site: SiteDescription } | { ok: false; error: 'two_required' };

export function applyStatsForm(site: SiteDescription, form: StatsForm): StatsResult {
  const items = cleanStats(form);
  if (items.length === 0) return { ok: true, site: replaceOrInsert(site, 'stats', null, BEFORE_STATS) };
  if (items.length < 2) return { ok: false, error: 'two_required' };
  const kept = site.pages[0].sections.find((candidate): candidate is StatsSection => candidate.type === 'stats');
  const section = (kept ? { ...kept, items } : { type: 'stats', variant: 'row', title: 'L’entreprise en chiffres', items }) as StatsSection;
  return { ok: true, site: replaceOrInsert(site, 'stats', section, BEFORE_STATS) };
}

// Valeurs actuelles pour préremplir les formulaires : sept lignes de jours, quatre lignes de chiffres.
export function currentForms(site: SiteDescription): { hours: HoursForm; stats: StatsForm } {
  const sections = site.pages[0].sections;
  const hours = sections.find((section): section is HoursSection => section.type === 'hours');
  const stats = sections.find((section): section is StatsSection => section.type === 'stats');
  return {
    hours: { rows: DAYS.map((day) => ({ day, hours: hours?.rows.find((row) => row.day.toLowerCase() === day.toLowerCase())?.hours ?? '' })), note: hours?.note },
    stats: { items: Array.from({ length: 4 }, (_, index) => stats?.items[index] ?? { value: '', label: '' }) },
  };
}
