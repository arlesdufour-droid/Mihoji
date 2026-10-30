import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { fileBlobs, projectFiles, projectVersions, projects } from '@/db/schema';
import { applyOperations, filesManifest, hashContent, type OperationPlan } from '@/lib/engine/operations';

export type ChatPersistResult =
  | { changed: true; html: string; files: string[]; versionId: string }
  | { changed: false };

export async function persistChatOperations(projectId: string, prompt: string, plan: OperationPlan): Promise<ChatPersistResult> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [project] = await tx.select({ id: projects.id, currentVersionId: projects.currentVersionId }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new Error('project_not_found');
    const rows = await tx.select({ path: projectFiles.path, content: fileBlobs.content }).from(projectFiles).innerJoin(fileBlobs, eq(projectFiles.hash, fileBlobs.hash)).where(eq(projectFiles.projectId, projectId));
    let files = new Map(rows.map((row) => [row.path, row.content]));
    let applied = 0;
    for (const operation of plan.operations) {
      try {
        files = applyOperations(files, { summary: plan.summary, operations: [operation] });
        applied += 1;
      } catch (error) {
        console.warn('Chat operation skipped.', error);
      }
    }
    if (applied === 0) return { changed: false };
    for (const [path, content] of files) {
      if (rows.find((row) => row.path === path)?.content === content) continue;
      const hash = hashContent(content);
      await tx.insert(fileBlobs).values({ hash, content }).onConflictDoNothing();
      await tx.insert(projectFiles).values({ projectId, path, hash }).onConflictDoUpdate({ target: [projectFiles.projectId, projectFiles.path], set: { hash, updatedAt: new Date() } });
    }
    const [version] = await tx.insert(projectVersions).values({ projectId, parentVersionId: project.currentVersionId, createdBy: 'agent', summary: prompt.slice(0, 200), filesSnapshot: filesManifest(files), status: 'built' }).returning({ id: projectVersions.id });
    if (!version) throw new Error('version_creation_failed');
    await tx.update(projects).set({ currentVersionId: version.id }).where(eq(projects.id, projectId));
    return { changed: true, html: files.get('index.html') ?? '', files: [...files.keys()], versionId: version.id };
  });
}
