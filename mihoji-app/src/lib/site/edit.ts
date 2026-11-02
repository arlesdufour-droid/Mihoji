import { z } from 'zod';
import { contrastRatio, parseColor } from '../engine/contrast';
import { structureIssues } from '../engine/html-analysis';
import { imageSlots } from '../photos/assign';
import { modulesSchema, type SiteModules } from './modules';
import { renderSite } from './render';
import { ctaSchema, sectionSchema, siteSchema, styleIds, type Section, type SiteDescription } from './schema';
import { getStyle, guaranteedPairs, resolveTheme } from './themes';

// Modifications du site par le chat : l'IA ne produit jamais de HTML, mais une liste d'opérations sur la description structurée.
// Ce module est pur (aucun réseau, aucune base) : application des opérations, restauration des photos, contrôles automatiques.
// Les index désignent les sections de la page d'accueil, dans l'état obtenu après les opérations précédentes.

const index = z.number().int().min(0).max(40);

export const editOperationSchema = z.discriminatedUnion('op', [
  // Fusion superficielle : les clés de « set » remplacent celles de la section ; null supprime une clé facultative. Le type ne change pas.
  z.object({ op: z.literal('updateSection'), index, set: z.record(z.string(), z.unknown()) }),
  z.object({ op: z.literal('insertSection'), index, section: z.unknown() }),
  z.object({ op: z.literal('removeSection'), index }),
  z.object({ op: z.literal('moveSection'), from: index, to: index }),
  z.object({ op: z.literal('setTheme'), style: z.enum(styleIds), palette: z.string().regex(/^[a-z-]+$/).optional() }),
  z.object({ op: z.literal('setSeo'), title: z.string().trim().min(1).max(70).optional(), description: z.string().trim().min(1).max(170).optional() }),
  z.object({ op: z.literal('setPrimaryCta'), label: ctaSchema.shape.label, href: ctaSchema.shape.href }),
  // Remplace l'ensemble des modules fonctionnels (null les retire tous).
  z.object({ op: z.literal('setModules'), modules: z.unknown() }),
]);
export type EditOperation = z.infer<typeof editOperationSchema>;

export const editPlanSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  operations: z.array(editOperationSchema).max(12),
});
export type EditPlan = z.infer<typeof editPlanSchema>;

type Entry = { section: Section; origin: number | null; touched: boolean };

export type AppliedEdit = {
  site: SiteDescription;
  // Pour chaque section du résultat : index d'origine (null si ajoutée) et indicateur « modifiée ».
  entries: { origin: number | null; touched: boolean }[];
  removed: number;
  moved: boolean;
  global: { theme: boolean; seo: boolean; primaryCta: boolean; modules: boolean };
};

export type ApplyResult = { ok: true; applied: AppliedEdit } | { ok: false; errors: string[] };

function describe(operation: EditOperation, position: number): string {
  const target = 'index' in operation ? ` (section ${operation.index})` : operation.op === 'moveSection' ? ` (de ${operation.from} vers ${operation.to})` : '';
  return `opération ${position + 1} « ${operation.op} »${target}`;
}

function issuesOf(error: z.ZodError): string {
  return error.issues.slice(0, 4).map((issue) => `${issue.path.join('.') || '(racine)'} : ${issue.message}`).join(' ; ');
}

export function applyEditPlan(site: SiteDescription, plan: EditPlan): ApplyResult {
  const errors: string[] = [];
  const next: SiteDescription = structuredClone(site);
  let entries: Entry[] = next.pages[0].sections.map((section, origin) => ({ section, origin, touched: false }));
  let removed = 0;
  let moved = false;
  const global = { theme: false, seo: false, primaryCta: false, modules: false };

  plan.operations.forEach((operation, position) => {
    const label = describe(operation, position);
    switch (operation.op) {
      case 'updateSection': {
        const entry = entries[operation.index];
        if (!entry) { errors.push(`${label} : il n’y a pas de section à cet index (la page en compte ${entries.length}, numérotées à partir de 0).`); return; }
        if ('type' in operation.set && operation.set.type !== entry.section.type) { errors.push(`${label} : le type d’une section ne change pas ; supprime-la et insère-en une nouvelle.`); return; }
        const merged: Record<string, unknown> = { ...entry.section };
        for (const [key, value] of Object.entries(operation.set)) {
          if (value === null) delete merged[key];
          else merged[key] = value;
        }
        const parsed = sectionSchema.safeParse(merged);
        if (!parsed.success) { errors.push(`${label} : ${issuesOf(parsed.error)}`); return; }
        entry.section = parsed.data;
        entry.touched = true;
        return;
      }
      case 'insertSection': {
        if (operation.index > entries.length) { errors.push(`${label} : index trop grand (la page compte ${entries.length} sections).`); return; }
        const parsed = sectionSchema.safeParse(operation.section);
        if (!parsed.success) { errors.push(`${label} : ${issuesOf(parsed.error)}`); return; }
        entries = [...entries.slice(0, operation.index), { section: parsed.data, origin: null, touched: true }, ...entries.slice(operation.index)];
        return;
      }
      case 'removeSection': {
        if (!entries[operation.index]) { errors.push(`${label} : il n’y a pas de section à cet index.`); return; }
        entries = entries.filter((_, current) => current !== operation.index);
        removed += 1;
        return;
      }
      case 'moveSection': {
        if (!entries[operation.from] || operation.to >= entries.length) { errors.push(`${label} : index hors de la page (${entries.length} sections).`); return; }
        const [entry] = entries.splice(operation.from, 1);
        entries.splice(operation.to, 0, entry);
        moved = true;
        return;
      }
      case 'setTheme': {
        const style = getStyle(operation.style);
        if (operation.palette && !style.palettes.some((palette) => palette.id === operation.palette)) {
          errors.push(`${label} : palette « ${operation.palette} » inconnue pour le style « ${style.id} » (palettes : ${style.palettes.map((palette) => palette.id).join(', ')}).`);
          return;
        }
        next.theme = { style: style.id, palette: operation.palette };
        global.theme = true;
        return;
      }
      case 'setSeo': {
        next.seo = { title: operation.title ?? next.seo.title, description: operation.description ?? next.seo.description };
        global.seo = true;
        return;
      }
      case 'setPrimaryCta': {
        next.primaryCta = { label: operation.label, href: operation.href };
        global.primaryCta = true;
        return;
      }
      case 'setModules': {
        global.modules = true;
        if (operation.modules === null || operation.modules === undefined) { next.modules = undefined; return; }
        const parsed = modulesSchema.safeParse(operation.modules);
        if (!parsed.success) { errors.push(`${label} : ${issuesOf(parsed.error)}`); return; }
        next.modules = parsed.data as SiteModules;
        return;
      }
    }
  });
  if (errors.length > 0) return { ok: false, errors };

  next.pages[0].sections = entries.map((entry) => entry.section);
  const parsed = siteSchema.safeParse(next);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.slice(0, 8).map((issue) => `${issue.path.join('.') || '(racine)'} : ${issue.message}`) };
  return { ok: true, applied: { site: parsed.data, entries: entries.map(({ origin, touched }) => ({ origin, touched })), removed, moved, global } };
}

// --- Photos -------------------------------------------------------------------------------------------------------

type PhotoSlot = { query?: string; src?: string; alt: string; credit?: { name: string; url: string } };

// Version du site montrée au modèle : les photos déjà choisies (src, crédit) sont retirées, il ne voit que leur requête et leur texte alternatif.
export function stripPhotos(site: SiteDescription): SiteDescription {
  const copy = structuredClone(site);
  for (const slot of imageSlots(copy) as PhotoSlot[]) {
    if (slot.query && slot.src) { delete slot.src; delete slot.credit; }
  }
  return copy;
}

// Rend aux images de la nouvelle version la photo qu'avait la même requête dans l'ancienne (dans l'ordre). Les requêtes nouvelles restent sans photo.
export function restorePhotos(before: SiteDescription, after: SiteDescription): SiteDescription {
  const pool = new Map<string, PhotoSlot[]>();
  for (const slot of imageSlots(before) as PhotoSlot[]) {
    if (slot.query && slot.src) pool.set(slot.query, [...(pool.get(slot.query) ?? []), slot]);
  }
  const copy = structuredClone(after);
  for (const slot of imageSlots(copy) as PhotoSlot[]) {
    if (!slot.query || slot.src) continue;
    const donor = pool.get(slot.query)?.shift();
    if (donor?.src) { slot.src = donor.src; slot.credit = donor.credit; }
  }
  return copy;
}

// --- Contrôles automatiques ---------------------------------------------------------------------------------------

// Objets « image » d'une description : texte alternatif et requête de photo et/ou adresse.
function imagesOf(value: unknown, out: PhotoSlot[] = []): PhotoSlot[] {
  if (Array.isArray(value)) value.forEach((item) => imagesOf(item, out));
  else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.alt === 'string' && (typeof record.query === 'string' || typeof record.src === 'string')) out.push(record as PhotoSlot);
    else Object.values(record).forEach((item) => imagesOf(item, out));
  }
  return out;
}

const PHONE = /(?:\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => strings(item, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => strings(item, out));
  return out;
}

function changedStrings(applied: AppliedEdit): string[] {
  const sections = applied.site.pages[0].sections;
  const out: string[] = [];
  applied.entries.forEach((entry, position) => { if (entry.touched) strings(sections[position], out); });
  if (applied.global.seo) strings(applied.site.seo, out);
  if (applied.global.primaryCta) strings(applied.site.primaryCta, out);
  if (applied.global.modules) strings(applied.site.modules, out);
  return out;
}

function sameJson(first: unknown, second: unknown): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

// Contrôles après une modification, sur le résultat rendu. Renvoie la liste des problèmes (vide si tout est bon) ;
// au moindre problème, la modification est annulée (rien n'est enregistré) et le modèle réessaie avec ces remarques.
export function auditEdit(before: SiteDescription, applied: AppliedEdit): string[] {
  const issues: string[] = [];
  const { site } = applied;
  const beforeSections = before.pages[0].sections;
  const afterSections = site.pages[0].sections;

  // 1. Sections non concernées : strictement inchangées, dans le même ordre relatif (sauf déplacement demandé).
  let lastOrigin = -1;
  applied.entries.forEach((entry, position) => {
    if (entry.origin === null || entry.touched) return;
    if (!sameJson(afterSections[position], beforeSections[entry.origin])) issues.push(`la section « ${afterSections[position].type} » (index ${position}) n’était pas concernée mais a changé.`);
    if (!applied.moved && entry.origin < lastOrigin) issues.push('l’ordre des sections non concernées a changé.');
    lastOrigin = Math.max(lastOrigin, entry.origin);
  });

  // 2. Éléments globaux : inchangés sauf demande explicite.
  if (!applied.global.theme && !sameJson(site.theme, before.theme)) issues.push('le style du site a changé sans que ce soit demandé.');
  if (!applied.global.seo && !sameJson(site.seo, before.seo)) issues.push('le titre ou la description du site (SEO) ont changé sans que ce soit demandé.');
  if (!applied.global.primaryCta && !sameJson(site.primaryCta, before.primaryCta)) issues.push('l’appel à l’action principal a changé sans que ce soit demandé.');
  if (!applied.global.modules && !sameJson(site.modules, before.modules)) issues.push('les modules fonctionnels ont changé sans que ce soit demandé.');
  if (site.pages.length !== before.pages.length || site.pages.slice(1).some((page, position) => !sameJson(page, before.pages[position + 1]))) issues.push('les autres pages ont changé.');

  // 3. Une demande ne vide pas la page.
  if (applied.removed > 0 && applied.removed >= Math.ceil(beforeSections.length / 2)) issues.push(`trop de sections supprimées d’un coup (${applied.removed} sur ${beforeSections.length}).`);

  // 4. Aucune coordonnée inventée : téléphone et email viennent des jetons {{company.*}}.
  for (const text of changedStrings(applied).filter((value) => !/^(?:https?:)?\//.test(value))) {
    if (PHONE.test(text.replace(/\{\{company\.phone\}\}/g, '')) || EMAIL.test(text.replace(/\{\{company\.email\}\}/g, ''))) issues.push(`coordonnées écrites en dur (« ${text.slice(0, 50)} ») : utilise {{company.phone}} et {{company.email}}.`);
  }

  // 5. Aucune adresse d'image inventée : seules les photos déjà présentes sont autorisées, les nouvelles passent par « query ».
  const known = new Set(imagesOf(before.pages).map((slot) => slot.src).filter(Boolean));
  applied.entries.forEach((entry, position) => {
    if (!entry.touched) return;
    for (const slot of imagesOf(afterSections[position])) {
      if (slot.src && !known.has(slot.src)) issues.push('une image a une adresse inventée : décris la photo voulue avec « query » (en anglais) et laisse « src » vide.');
    }
  });

  // 6. Contraste WCAG AA : les paires texte/fond de la palette résultante restent lisibles.
  const { palette } = resolveTheme(site.theme);
  for (const [foreground, background] of guaranteedPairs) {
    const first = parseColor(palette[foreground] as string);
    const second = parseColor(palette[background] as string);
    if (first && second && contrastRatio(first, second) < 4.5) issues.push(`contraste insuffisant entre ${foreground} et ${background} dans la palette « ${palette.id} ».`);
  }

  // 7. Le rendu doit réussir et produire un HTML valide.
  try {
    for (const [file, html] of Object.entries(renderSite(site, { inlineCss: true }).files)) {
      if (structureIssues(html) > 0) issues.push(`le rendu de ${file} contient du HTML mal formé.`);
      if (/<script|cdn\.tailwindcss/i.test(html)) issues.push(`le rendu de ${file} contient une dépendance ou un script externe.`);
      if ((html.match(/<h1[ >]/g) ?? []).length !== 1) issues.push(`le rendu de ${file} doit contenir exactement un titre principal.`);
    }
  } catch (error) {
    issues.push(`le rendu a échoué (${error instanceof Error ? error.message : 'erreur inconnue'}).`);
  }
  return [...new Set(issues)];
}
