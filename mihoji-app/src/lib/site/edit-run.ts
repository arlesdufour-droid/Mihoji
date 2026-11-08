import { z } from 'zod';
import { RETRY_FEEDBACK_PREFIX } from '../ai/failure';
import type { CompletionMessage } from '../ai/providers/types';
import { extractJson, formatIssues, type Complete, type DesignUsage } from './design';
import { shadowCostEur } from '../ai/pricing';
import { applyEditPlan, auditEdit, editPlanSchema, restorePhotos } from './edit';
import { editSystemPrompt, editUserMessage, type EditCompany, type EditHistoryMessage } from './edit-prompt';
import type { SiteDescription } from './schema';

// Une demande du chat = au plus 3 essais. Chaque essai : appel du modèle, lecture du plan, application, contrôles automatiques.
// Au moindre problème l'essai est annulé (le site d'origine n'est jamais modifié ici) et le modèle reçoit la raison.

export type EditOutcome =
  | { ok: true; changed: boolean; site: SiteDescription; summary: string; usage: DesignUsage; attempts: number; rejections: string[] }
  | { ok: false; error: string; usage: DesignUsage; attempts: number; rejections: string[] };

export function editFeedback(errors: string[]): string {
  return `${RETRY_FEEDBACK_PREFIX} : ta proposition a été refusée et rien n’a été enregistré.\n${errors.slice(0, 8).map((error) => `- ${error}`).join('\n')}\nRecommence en respectant strictement les règles, avec la même description actuelle, et renvoie l’objet JSON {"summary":…,"operations":[…]} complet.`;
}

function emptyUsage(model: string): DesignUsage {
  return { promptTokens: 0, completionTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costEur: 0, attempts: 0, model };
}

export async function editSiteDesign(
  complete: Complete,
  model: string,
  input: { request: string; site: SiteDescription; company: EditCompany; history?: EditHistoryMessage[]; connectors?: string },
  options: { maxAttempts?: number; signal?: AbortSignal } = {},
): Promise<EditOutcome> {
  const maxAttempts = options.maxAttempts ?? 3;
  const usage = emptyUsage(model);
  const rejections: string[] = [];
  const messages: CompletionMessage[] = [
    { role: 'system', content: editSystemPrompt },
    { role: 'user', content: editUserMessage(input) },
  ];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await complete({ messages, maxTokens: 8_000, jsonMode: true, rawSystem: true, signal: options.signal });
    usage.promptTokens += result.promptTokens ?? 0;
    usage.completionTokens += result.completionTokens ?? 0;
    usage.cacheReadTokens += result.cacheReadTokens ?? 0;
    usage.cacheWriteTokens += result.cacheWriteTokens ?? 0;
    usage.costEur = Math.round((usage.costEur + (result.mock ? 0 : shadowCostEur(result.model ?? model, result))) * 1_000_000) / 1_000_000;
    usage.attempts += 1;
    usage.model = result.model ?? model;

    let errors: string[] = [];
    if (result.truncated) {
      errors = ['réponse coupée par la limite de longueur : fais moins d’opérations et des textes plus courts.'];
    } else {
      let plan: z.infer<typeof editPlanSchema> | null = null;
      try {
        const parsed = editPlanSchema.safeParse(extractJson(result.content));
        if (parsed.success) plan = parsed.data;
        else errors = formatIssues(parsed.error);
      } catch (error) {
        errors = [`réponse illisible : ${error instanceof Error ? error.message : 'JSON invalide'}`];
      }
      if (plan) {
        if (plan.operations.length === 0) return { ok: true, changed: false, site: input.site, summary: plan.summary, usage, attempts: attempt, rejections };
        const applied = applyEditPlan(input.site, plan);
        if (!applied.ok) {
          errors = applied.errors;
        } else {
          // Les photos déjà choisies sont rendues aux emplacements qui gardent la même requête, puis tout est contrôlé sur le résultat.
          const restored = restorePhotos(input.site, applied.applied.site);
          const candidate = { ...applied.applied, site: restored };
          errors = auditEdit(input.site, candidate);
          if (errors.length === 0) {
            const changed = JSON.stringify(restored) !== JSON.stringify(input.site);
            return { ok: true, changed, site: restored, summary: plan.summary, usage, attempts: attempt, rejections };
          }
        }
      }
    }
    rejections.push(...errors);
    messages.push({ role: 'assistant', content: result.content.slice(0, 30_000) || '{}' }, { role: 'user', content: editFeedback(errors) });
  }
  return { ok: false, error: `modification refusée après ${maxAttempts} essais : ${rejections.slice(-4).join(' ; ')}`, usage, attempts: maxAttempts, rejections };
}
