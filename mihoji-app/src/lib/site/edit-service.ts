import 'server-only';

import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { companies, siteGenerations } from '@/db/schema';
import { cityOf } from '@/lib/company/render';
import { resolveSitePhotos } from '@/lib/photos/service';
import { LlmProviderError } from '@/lib/ai/providers/types';
import { connectorsContext } from '@/lib/connectors/hints';
import { connectedProviders } from '@/lib/connectors/store';
import { designProvider } from './design-service';
import { editSiteDesign } from './edit-run';
import type { EditHistoryMessage } from './edit-prompt';
import { siteSchema } from './schema';
import { loadProjectSite, saveProjectSite } from './store';
import { renderSite } from './render';

export type SiteEditResult =
  | { status: 'changed'; summary: string; versionId: string; files: string[]; costEur: number; tokens: number; mock: boolean; attempts: number }
  | { status: 'unchanged'; summary: string; costEur: number; tokens: number; mock: boolean }
  | { status: 'rejected'; reasons: string[]; costEur: number; tokens: number; mock: boolean; attempts: number }
  | { status: 'not_a_site' };

// Modification du site par le chat : le modèle propose des opérations sur la description structurée, qui sont appliquées puis contrôlées
// (sections non concernées inchangées, contraste, rendu). Au moindre problème, rien n'est enregistré et le modèle réessaie.
export async function runSiteEdit(input: { projectId: string; workspaceId: string; userId?: string | null; request: string; history: EditHistoryMessage[]; signal?: AbortSignal }): Promise<SiteEditResult> {
  const db = getDb();
  const before = await loadProjectSite(input.projectId);
  if (!before) return { status: 'not_a_site' };
  const [company] = await db.select().from(companies).where(eq(companies.workspaceId, input.workspaceId)).limit(1);
  const fields = company?.missingFields && typeof company.missingFields === 'object' ? company.missingFields as Record<string, string> : {};
  const { provider, model, complete } = designProvider();
  const connected = await connectedProviders(input.workspaceId).catch(() => [] as string[]);
  const started = Date.now();
  const outcome = await editSiteDesign(complete, model, {
    request: input.request,
    site: before,
    history: input.history,
    connectors: connectorsContext(connected),
    company: { name: company?.name ?? 'Entreprise', activity: company?.activity, city: company ? cityOf(company.address) : undefined, hasPhone: Boolean(fields.phone), hasEmail: Boolean(fields.email) },
  }, { signal: input.signal });
  const tokens = outcome.usage.promptTokens + outcome.usage.completionTokens + outcome.usage.cacheReadTokens + outcome.usage.cacheWriteTokens;
  const mock = provider === 'mock';

  let result: SiteEditResult;
  let failure: string | null = outcome.ok ? null : outcome.error;
  let finalSite = outcome.ok ? outcome.site : null;
  if (outcome.ok && outcome.changed) {
    try {
      // Nouvelles photos demandées (requêtes sans image) ; une panne de photos ne bloque pas la modification.
      try {
        finalSite = siteSchema.parse((await resolveSitePhotos(outcome.site, { offline: mock })).site);
      } catch (error) {
        console.error('Photo resolution failed during edit.', error);
      }
      renderSite(finalSite!, { inlineCss: true });
      const saved = await db.transaction(async (tx) => {
        // Si le site a changé pendant la réflexion du modèle (autre onglet), on n'écrase rien.
        const current = await loadProjectSite(input.projectId, tx);
        if (JSON.stringify(current) !== JSON.stringify(before)) throw new Error('site_changed_concurrently');
        return saveProjectSite(tx, { projectId: input.projectId, site: finalSite!, summary: input.request, createdBy: 'agent' });
      });
      result = { status: 'changed', summary: outcome.summary, versionId: saved.versionId, files: saved.files, costEur: outcome.usage.costEur, tokens, mock, attempts: outcome.attempts };
    } catch (error) {
      console.error('Site edit could not be saved.', error);
      failure = error instanceof Error ? error.message : 'enregistrement impossible';
      result = { status: 'rejected', reasons: [failure], costEur: outcome.usage.costEur, tokens, mock, attempts: outcome.attempts };
    }
  } else if (outcome.ok) {
    result = { status: 'unchanged', summary: outcome.summary, costEur: outcome.usage.costEur, tokens, mock };
  } else {
    result = { status: 'rejected', reasons: outcome.rejections.length ? outcome.rejections.slice(-6) : [outcome.error], costEur: outcome.usage.costEur, tokens, mock, attempts: outcome.attempts };
  }

  try {
    await db.insert(siteGenerations).values({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      task: 'edit',
      request: input.request,
      company: { name: company?.name },
      provider,
      model: outcome.usage.model,
      status: result.status === 'rejected' ? 'failed' : 'succeeded',
      attempts: Math.max(1, outcome.usage.attempts),
      promptTokens: outcome.usage.promptTokens,
      completionTokens: outcome.usage.completionTokens,
      cacheReadTokens: outcome.usage.cacheReadTokens,
      cacheWriteTokens: outcome.usage.cacheWriteTokens,
      durationMs: Date.now() - started,
      shadowCostEur: outcome.usage.costEur,
      site: result.status === 'changed' ? finalSite : null,
      error: result.status === 'rejected' ? (failure ?? result.reasons.join(' ; ')).slice(0, 2_000) : null,
      createdBy: input.userId ?? null,
    });
  } catch (error) {
    console.error('Edit generation log failed.', error);
  }
  return result;
}

export function isProviderError(error: unknown): error is LlmProviderError {
  return error instanceof LlmProviderError;
}
