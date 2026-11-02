import 'server-only';

import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { chatMessages, companies, projects } from '@/db/schema';
import { cityOf } from '@/lib/company/render';
import { nafLabel } from '@/lib/company/lookup';
import { generationSite, runDesignGeneration } from './design-service';
import { loadProjectSite, saveProjectSite } from './store';

export type MigrationResult =
  | { status: 'migrated'; versionId: string; costEur: number; model: string }
  | { status: 'already' }
  | { status: 'failed'; error: string };

// Migre un projet de l'ancien format (HTML écrit par l'IA) vers le nouveau (description structurée + rendu) :
// le site est recréé par le modèle de design à partir des données de l'entreprise et devient une NOUVELLE version.
// Les anciennes versions, publications et messages du chat restent intacts ; revenir à une ancienne version est toujours possible.
export async function migrateProjectToSite(projectId: string, options: { signal?: AbortSignal; announce?: boolean } = {}): Promise<MigrationResult> {
  const db = getDb();
  const [project] = await db.select({ id: projects.id, name: projects.name, workspaceId: projects.workspaceId }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new Error('project_not_found');
  if (await loadProjectSite(projectId)) return { status: 'already' };
  const [company] = await db.select().from(companies).where(eq(companies.workspaceId, project.workspaceId)).limit(1);
  if (!company) return { status: 'failed', error: 'entreprise introuvable : le site ne peut pas être recréé sans ses données' };
  const fields = company.missingFields && typeof company.missingFields === 'object' ? company.missingFields as Record<string, string> : {};
  const activity = nafLabel(company.activity);
  const city = cityOf(company.address);
  const request = `Crée le site vitrine de ${company.name}, ${activity.toLowerCase()}${city ? ` à ${city}` : ''}. Un site soigné, avec de vraies photos et des textes concrets pour ce métier, qui donne envie de venir ou de passer commande.`;
  const record = await runDesignGeneration({
    task: 'create', request, trade: activity, workspaceId: project.workspaceId, projectId,
    company: { name: company.name, activity, city, address: company.address, hasPhone: Boolean(fields.phone), hasEmail: Boolean(fields.email) },
  }, options.signal);
  const site = generationSite(record);
  if (record.status !== 'succeeded' || !site) return { status: 'failed', error: record.error ?? 'génération refusée' };
  const saved = await db.transaction((tx) => saveProjectSite(tx, { projectId, site, summary: 'Migration vers le nouveau format de site', createdBy: 'agent' }));
  if (options.announce !== false) {
    await db.insert(chatMessages).values({ projectId, role: 'assistant', content: 'J’ai refondu votre site avec un nouveau design, de vraies photos et des textes adaptés à votre activité. Votre ancienne version est conservée dans l’historique. Dites-moi ce que vous voulez modifier.' });
  }
  return { status: 'migrated', versionId: saved.versionId, costEur: record.shadowCostEur, model: record.model };
}

// Projets encore à l'ancien format (sans description structurée).
export async function legacyProjectIds(): Promise<string[]> {
  const rows = await getDb().select({ id: projects.id }).from(projects);
  const legacy: string[] = [];
  for (const row of rows) if (!(await loadProjectSite(row.id))) legacy.push(row.id);
  return legacy;
}
