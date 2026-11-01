import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { companies, fileBlobs, projectFiles, projectVersions, projects } from '@/db/schema';
import { injectCompanyData } from '@/lib/company/render';
import { applyOperations, filesManifest, hashContent, type OperationPlan } from '@/lib/engine/operations';
import { enforceQuality } from '@/lib/engine/quality';

export type ChatPersistResult =
  | { changed: true; html: string; files: string[]; versionId: string; applied: number; skipped: number; notes: string[] }
  | { changed: false; rejected?: string };

type PersistOptions = {
  // En mode strict, une seule opération impossible à appliquer annule toute la modification (rien n'est enregistré).
  strict?: boolean;
};

export async function persistChatOperations(projectId: string, prompt: string, plan: OperationPlan, options: PersistOptions = {}): Promise<ChatPersistResult> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [project] = await tx.select({ id: projects.id, workspaceId: projects.workspaceId, currentVersionId: projects.currentVersionId }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new Error('project_not_found');
    const rows = await tx.select({ path: projectFiles.path, content: fileBlobs.content }).from(projectFiles).innerJoin(fileBlobs, eq(projectFiles.hash, fileBlobs.hash)).where(eq(projectFiles.projectId, projectId));
    const original = new Map(rows.map((row) => [row.path, row.content]));
    let files = new Map(original);
    let applied = 0;
    let skipped = 0;
    for (const operation of plan.operations) {
      try {
        files = applyOperations(files, { summary: plan.summary, operations: [operation] });
        applied += 1;
      } catch (error) {
        skipped += 1;
        console.warn('Chat operation skipped.', error);
      }
    }
    if (applied === 0) return { changed: false };
    if (skipped > 0 && options.strict) {
      return { changed: false, rejected: `${skipped} opération(s) n’ont pas pu être appliquées : l’extrait à remplacer (« search ») doit apparaître exactement dans le fichier. Recopie-le à l’identique.` };
    }
    const [company] = await tx.select().from(companies).where(eq(companies.workspaceId, project.workspaceId)).limit(1);
    const quality = enforceQuality(original, files, { prompt, describe: (text) => injectCompanyData(text, company) });
    if (!quality.ok) return { changed: false, rejected: quality.reason };
    files = quality.files;
    for (const [path, content] of files) {
      if (original.get(path) === content) continue;
      const hash = hashContent(content);
      await tx.insert(fileBlobs).values({ hash, content }).onConflictDoNothing();
      await tx.insert(projectFiles).values({ projectId, path, hash }).onConflictDoUpdate({ target: [projectFiles.projectId, projectFiles.path], set: { hash, updatedAt: new Date() } });
    }
    for (const path of original.keys()) {
      if (!files.has(path)) await tx.delete(projectFiles).where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.path, path)));
    }
    const [version] = await tx.insert(projectVersions).values({ projectId, parentVersionId: project.currentVersionId, createdBy: 'agent', summary: prompt.slice(0, 200), filesSnapshot: filesManifest(files), status: 'built' }).returning({ id: projectVersions.id });
    if (!version) throw new Error('version_creation_failed');
    await tx.update(projects).set({ currentVersionId: version.id }).where(eq(projects.id, projectId));
    return { changed: true, html: files.get('index.html') ?? '', files: [...files.keys()], versionId: version.id, applied, skipped, notes: quality.notes };
  });
}
