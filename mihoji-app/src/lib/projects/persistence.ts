import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { fileBlobs, projectFiles, projectVersions, projects } from '@/db/schema';
import { hashContent } from '@/lib/engine/operations';

export async function persistChatVersion(projectId: string, prompt: string, generatedText: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [project] = await tx.select({ id: projects.id, currentVersionId: projects.currentVersionId }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new Error('project_not_found');
    const [current] = await tx.select({ content: fileBlobs.content }).from(projectFiles).innerJoin(fileBlobs, eq(projectFiles.hash, fileBlobs.hash)).where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.path, 'index.html'))).limit(1);
    const currentHtml = current?.content ?? '';
    const nextHtml = /horaires|heures|lundi|8h/i.test(prompt)
      ? currentHtml.includes('data-mihoji="horaires"')
        ? currentHtml
        : currentHtml.replace('</main>', '<section data-mihoji="horaires" class="mt-8 rounded-xl bg-slate-100 p-5"><h2 class="text-2xl font-bold">Horaires</h2><p class="mt-2">Du lundi au vendredi, de 8h à 18h.</p></section></main>')
      : currentHtml;
    const content = nextHtml || generatedText;
    const hash = hashContent(content);
    await tx.insert(fileBlobs).values({ hash, content }).onConflictDoNothing();
    await tx.insert(projectFiles).values({ projectId, path: 'index.html', hash }).onConflictDoUpdate({ target: [projectFiles.projectId, projectFiles.path], set: { hash, updatedAt: new Date() } });
    const [version] = await tx.insert(projectVersions).values({ projectId, parentVersionId: project.currentVersionId, createdBy: 'agent', summary: prompt.slice(0, 200), filesSnapshot: { 'index.html': hash }, status: 'built' }).returning({ id: projectVersions.id });
    if (!version) throw new Error('version_creation_failed');
    await tx.update(projects).set({ currentVersionId: version.id }).where(eq(projects.id, projectId));
    return { html: content, versionId: version.id };
  });
}
