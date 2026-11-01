import 'server-only';

import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { siteGenerations } from '@/db/schema';
import { AnthropicProvider } from '@/lib/ai/providers/anthropic';
import { GroqProvider } from '@/lib/ai/providers/groq';
import { MockProvider } from '@/lib/ai/providers/mock';
import { LlmProviderError, type LlmProvider } from '@/lib/ai/providers/types';
import { designRoute, type DesignTask } from '@/lib/ai/routing';
import { createSiteDesign, restyleSiteDesign, type Complete, type CreateInput, type DesignResult } from './design';
import { siteSchema, type SiteDescription } from './schema';

export type DesignProvider = { provider: 'anthropic' | 'groq' | 'mock'; model: string; complete: Complete };

// Fournisseur des tâches de design (création, changement de style). En production sans clé : erreur explicite.
export function designProvider(): DesignProvider {
  const route = designRoute();
  if (route.provider === 'none') throw new LlmProviderError(route.error, 503);
  const llm: LlmProvider = route.provider === 'anthropic' ? new AnthropicProvider() : route.provider === 'groq' ? new GroqProvider() : new MockProvider();
  return { provider: route.provider, model: route.model, complete: (request) => llm.complete({ ...request, model: route.model }) };
}

export type GenerationRecord = typeof siteGenerations.$inferSelect;

type RunInput = { workspaceId: string | null; userId?: string | null; projectId?: string | null; company: CreateInput['company'] & Record<string, unknown> }
  & ({ task: 'create'; request: string; trade?: string; style?: CreateInput['style'] } | { task: 'restyle'; request: string; site: SiteDescription });

// Lance une génération et l'enregistre (réussie ou non) avec son coût réel en euros.
export async function runDesignGeneration(input: RunInput, signal?: AbortSignal): Promise<GenerationRecord> {
  const { provider, model, complete } = designProvider();
  const started = Date.now();
  let result: DesignResult<SiteDescription>;
  try {
    result = input.task === 'create'
      ? await createSiteDesign(complete, model, { request: input.request, company: input.company, trade: input.trade, style: input.style }, { signal })
      : await restyleSiteDesign(complete, model, input.site, input.request, { signal });
  } catch (error) {
    console.error('Design generation failed.', error);
    const code = error instanceof LlmProviderError ? error.code : error instanceof Error ? error.message : 'erreur inconnue';
    result = { ok: false, error: `fournisseur IA indisponible (${code})`, usage: { promptTokens: 0, completionTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costEur: 0, attempts: 1, model } };
  }
  const [record] = await getDb().insert(siteGenerations).values({
    workspaceId: input.workspaceId,
    projectId: input.projectId ?? null,
    task: input.task as DesignTask,
    request: input.request,
    company: input.company,
    provider,
    model: result.usage.model,
    status: result.ok ? 'succeeded' : 'failed',
    attempts: Math.max(1, result.usage.attempts),
    promptTokens: result.usage.promptTokens,
    completionTokens: result.usage.completionTokens,
    cacheReadTokens: result.usage.cacheReadTokens,
    cacheWriteTokens: result.usage.cacheWriteTokens,
    durationMs: Date.now() - started,
    shadowCostEur: result.usage.costEur,
    site: result.ok ? result.value : null,
    error: result.ok ? null : result.error,
    createdBy: input.userId ?? null,
  }).returning();
  return record;
}

export async function recentGenerations(limit = 20): Promise<GenerationRecord[]> {
  return getDb().select().from(siteGenerations).orderBy(desc(siteGenerations.createdAt)).limit(limit);
}

export async function generationById(id: string): Promise<GenerationRecord | undefined> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const [record] = await getDb().select().from(siteGenerations).where(eq(siteGenerations.id, id)).limit(1);
  return record;
}

export function generationSite(record: GenerationRecord): SiteDescription | null {
  const parsed = siteSchema.safeParse(record.site);
  return parsed.success ? parsed.data : null;
}
