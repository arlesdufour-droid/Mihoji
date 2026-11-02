import 'server-only';

import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { fileBlobs, projectFiles, projectVersions, projects } from '@/db/schema';
import { filesManifest, hashContent } from '@/lib/engine/operations';
import { parseStoredSite, SITE_FILE, siteFiles } from './files';
import type { SiteDescription } from './schema';

export { parseStoredSite, SITE_FILE, siteFiles };

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

// Un projet « au nouveau format » garde sa description structurée dans le fichier site.json (source de vérité, versionnée comme le reste)
// et le HTML rendu à partir d'elle (index.html…, CSS inclus dans la page pour l'aperçu). Le HTML n'est jamais modifié à la main.

export async function loadProjectSite(projectId: string, db: Db | Tx = getDb()): Promise<SiteDescription | null> {
  const [row] = await db.select({ content: fileBlobs.content }).from(projectFiles).innerJoin(fileBlobs, eq(projectFiles.hash, fileBlobs.hash)).where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.path, SITE_FILE))).limit(1);
  return parseStoredSite(row?.content);
}

// Enregistre une nouvelle version du projet : description + rendu, en une seule transaction. Les anciennes versions restent intactes.
export async function saveProjectSite(tx: Tx, input: { projectId: string; site: SiteDescription; summary: string; createdBy: 'user' | 'agent' }): Promise<{ versionId: string; files: string[] }> {
  const { projectId } = input;
  const [project] = await tx.select({ currentVersionId: projects.currentVersionId }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new Error('project_not_found');
  const next = siteFiles(input.site);
  const existing = await tx.select({ path: projectFiles.path, hash: projectFiles.hash }).from(projectFiles).where(eq(projectFiles.projectId, projectId));
  const known = new Map(existing.map((file) => [file.path, file.hash]));
  for (const [path, content] of next) {
    const hash = hashContent(content);
    if (known.get(path) === hash) continue;
    await tx.insert(fileBlobs).values({ hash, content }).onConflictDoNothing();
    await tx.insert(projectFiles).values({ projectId, path, hash }).onConflictDoUpdate({ target: [projectFiles.projectId, projectFiles.path], set: { hash, updatedAt: new Date() } });
  }
  for (const path of known.keys()) {
    if (!next.has(path)) await tx.delete(projectFiles).where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.path, path)));
  }
  const [version] = await tx.insert(projectVersions).values({ projectId, parentVersionId: project.currentVersionId, createdBy: input.createdBy, summary: input.summary.slice(0, 200), filesSnapshot: filesManifest(next), status: 'built' }).returning({ id: projectVersions.id });
  if (!version) throw new Error('version_creation_failed');
  await tx.update(projects).set({ currentVersionId: version.id }).where(eq(projects.id, projectId));
  return { versionId: version.id, files: [...next.keys()] };
}
