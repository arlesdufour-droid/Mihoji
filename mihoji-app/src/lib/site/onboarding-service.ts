import 'server-only';

import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { chatMessages, companies, projects, siteGenerations } from '@/db/schema';
import { generationSite, runDesignGeneration } from './design-service';
import { designCompanyOf, projectNameOf } from './onboarding-request';
import { saveProjectSite } from './store';
import type { styleIds } from './schema';

export type OnboardingSiteResult =
  | { status: 'created'; projectId: string; costEur: number; model: string; provider: string; mock: boolean; tokens: number }
  | { status: 'failed'; error: string }
  | { status: 'no_company' };

// Crée le premier site d'un espace à partir de la demande de l'utilisateur et des données de son entreprise :
// même chaîne que le laboratoire (modèle de design, validation, photos), enregistrée comme un projet au nouveau format
// (site.json + HTML rendu). Rien n'est créé si la génération échoue.
export async function createOnboardingSite(input: { workspaceId: string; userId: string; request: string; style?: (typeof styleIds)[number]; signal?: AbortSignal }): Promise<OnboardingSiteResult> {
  const db = getDb();
  const [company] = await db.select().from(companies).where(eq(companies.workspaceId, input.workspaceId)).limit(1);
  if (!company) return { status: 'no_company' };
  const { trade, company: designCompany } = designCompanyOf(company);
  const record = await runDesignGeneration({ task: 'create', request: input.request, trade, style: input.style, company: designCompany, workspaceId: input.workspaceId, userId: input.userId }, input.signal);
  const site = generationSite(record);
  if (record.status !== 'succeeded' || !site) return { status: 'failed', error: record.error ?? 'génération refusée' };
  const projectId = await db.transaction(async (tx) => {
    const [project] = await tx.insert(projects).values({ workspaceId: input.workspaceId, name: projectNameOf(company) }).returning({ id: projects.id });
    if (!project) throw new Error('project_creation_failed');
    await saveProjectSite(tx, { projectId: project.id, site, summary: 'Création initiale du site', createdBy: 'agent' });
    await tx.update(siteGenerations).set({ projectId: project.id }).where(eq(siteGenerations.id, record.id));
    await tx.insert(chatMessages).values([
      { projectId: project.id, role: 'user', content: input.request },
      { projectId: project.id, role: 'assistant', content: 'Votre site est prêt. Dites-moi ce que vous voulez modifier : textes, photos, style ou sections.' },
    ]);
    return project.id;
  });
  const tokens = record.promptTokens + record.completionTokens + record.cacheReadTokens + record.cacheWriteTokens;
  return { status: 'created', projectId, costEur: record.shadowCostEur, model: record.model, provider: record.provider, mock: record.provider === 'mock', tokens };
}
