import { z } from 'zod';
import { shadowCostEur, type TokenUsage } from '../ai/pricing';
import type { CompletionMessage, CompletionRequest, CompletionResult } from '../ai/providers/types';
import { designSystemPrompt, designUserMessage, restyleSystemPrompt, restyleUserMessage, type DesignCompany } from './design-prompt';
import { sectionVariants, siteSchema, styleIds, type SiteDescription } from './schema';
import { styles } from './themes';

// Génération d'un site par le modèle de design : appel, validation stricte par le schéma, nouvel essai guidé par les erreurs.
// Le fournisseur est injecté (Anthropic, Groq ou simulation) : ce module reste testable sans réseau.

export type Complete = (request: Omit<CompletionRequest, 'model'>) => Promise<CompletionResult>;

export type DesignUsage = Required<TokenUsage> & { costEur: number; attempts: number; model: string };

export type DesignResult<T> =
  | { ok: true; value: T; usage: DesignUsage; summary?: string }
  | { ok: false; error: string; usage: DesignUsage };

// Extrait le premier objet JSON d'une réponse (le modèle peut l'entourer d'un bloc de code malgré les consignes).
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('aucun objet JSON dans la réponse');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function issuePath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((out, key) => (typeof key === 'number' ? `${out}[${key}]` : out ? `${out}.${String(key)}` : String(key)), '');
}

export function formatIssues(error: z.ZodError, limit = 15): string[] {
  return error.issues.slice(0, limit).map((issue) => `${issuePath(issue.path) || '(racine)'} : ${issue.message}`);
}

export type ParsedDesign = { ok: true; site: SiteDescription } | { ok: false; errors: string[] };

export function parseDesign(text: string): ParsedDesign {
  let raw: unknown;
  try {
    raw = extractJson(text);
  } catch (error) {
    return { ok: false, errors: [`JSON illisible : ${error instanceof Error ? error.message : 'erreur inconnue'}`] };
  }
  const parsed = siteSchema.safeParse(raw);
  return parsed.success ? { ok: true, site: parsed.data } : { ok: false, errors: formatIssues(parsed.error) };
}

export function retryMessage(errors: string[]): string {
  return `Ta description a été refusée par le validateur :\n${errors.map((error) => `- ${error}`).join('\n')}\nCorrige ces points et renvoie la description JSON COMPLÈTE corrigée, sans rien d'autre.`;
}

function emptyUsage(model: string): DesignUsage {
  return { promptTokens: 0, completionTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costEur: 0, attempts: 0, model };
}

function addUsage(usage: DesignUsage, result: CompletionResult, fallbackModel: string): void {
  const model = result.model ?? fallbackModel;
  usage.promptTokens += result.promptTokens ?? 0;
  usage.completionTokens += result.completionTokens ?? 0;
  usage.cacheReadTokens += result.cacheReadTokens ?? 0;
  usage.cacheWriteTokens += result.cacheWriteTokens ?? 0;
  usage.costEur = Math.round((usage.costEur + (result.mock ? 0 : shadowCostEur(model, result))) * 1_000_000) / 1_000_000;
  usage.attempts += 1;
  usage.model = model;
}

export type CreateInput = { request: string; company: DesignCompany; trade?: string; style?: (typeof styleIds)[number] };

export async function createSiteDesign(complete: Complete, model: string, input: CreateInput, options: { maxAttempts?: number; signal?: AbortSignal } = {}): Promise<DesignResult<SiteDescription>> {
  const maxAttempts = options.maxAttempts ?? 3;
  const usage = emptyUsage(model);
  const messages: CompletionMessage[] = [
    { role: 'system', content: designSystemPrompt },
    { role: 'user', content: designUserMessage(input) },
  ];
  let lastErrors: string[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await complete({ messages, maxTokens: 16_000, jsonMode: true, rawSystem: true, signal: options.signal });
    addUsage(usage, result, model);
    const parsed = result.truncated ? { ok: false as const, errors: ['réponse coupée par la limite de longueur : raccourcis les textes'] } : parseDesign(result.content);
    if (parsed.ok) {
      if (input.style && parsed.site.theme.style !== input.style) parsed.site.theme = { style: input.style, palette: undefined };
      return { ok: true, value: parsed.site, usage };
    }
    lastErrors = parsed.errors;
    messages.push({ role: 'assistant', content: result.content.slice(0, 40_000) || '{}' }, { role: 'user', content: retryMessage(parsed.errors) });
  }
  return { ok: false, error: `description refusée après ${maxAttempts} essais : ${lastErrors.slice(0, 5).join(' ; ')}`, usage };
}

// Changement de style : le modèle ne choisit que le thème et des variantes ; le code applique ces choix,
// ce qui garantit que les textes, les sections et les modules restent strictement identiques.
export const restyleSchema = z.object({
  theme: z.object({ style: z.enum(styleIds), palette: z.string().regex(/^[a-z-]+$/).optional() }),
  variants: z.array(z.object({ index: z.number().int().min(0), variant: z.string() })).max(16).optional(),
  summary: z.string().trim().max(300).optional(),
});
export type RestylePlan = z.infer<typeof restyleSchema>;

export function applyRestyle(site: SiteDescription, plan: RestylePlan): SiteDescription {
  const style = styles.find((candidate) => candidate.id === plan.theme.style)!;
  const palette = style.palettes.some((candidate) => candidate.id === plan.theme.palette) ? plan.theme.palette : undefined;
  const next: SiteDescription = structuredClone(site);
  next.theme = { style: style.id, palette };
  const sections = next.pages[0].sections;
  for (const change of plan.variants ?? []) {
    const section = sections[change.index];
    if (!section) continue;
    const allowed = sectionVariants[section.type] as readonly string[];
    if (allowed.includes(change.variant)) (section as { variant: string }).variant = change.variant;
  }
  return siteSchema.parse(next);
}

export async function restyleSiteDesign(complete: Complete, model: string, site: SiteDescription, request: string, options: { maxAttempts?: number; signal?: AbortSignal } = {}): Promise<DesignResult<SiteDescription>> {
  const maxAttempts = options.maxAttempts ?? 2;
  const usage = emptyUsage(model);
  const messages: CompletionMessage[] = [
    { role: 'system', content: restyleSystemPrompt },
    { role: 'user', content: restyleUserMessage({ request, theme: site.theme, sections: site.pages[0].sections.map((section, index) => ({ index, type: section.type, variant: section.variant })) }) },
  ];
  let lastError = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await complete({ messages, maxTokens: 2_000, jsonMode: true, rawSystem: true, signal: options.signal });
    addUsage(usage, result, model);
    try {
      const plan = restyleSchema.parse(extractJson(result.content));
      return { ok: true, value: applyRestyle(site, plan), usage, summary: plan.summary };
    } catch (error) {
      lastError = error instanceof z.ZodError ? formatIssues(error).join(' ; ') : error instanceof Error ? error.message : 'réponse illisible';
      messages.push({ role: 'assistant', content: result.content || '{}' }, { role: 'user', content: retryMessage([lastError]) });
    }
  }
  return { ok: false, error: `changement de style refusé : ${lastError}`, usage };
}
