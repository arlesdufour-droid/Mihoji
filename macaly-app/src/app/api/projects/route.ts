import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getDb } from '@/db/client';
import { fileBlobs, projectFiles, projectVersions, projects } from '@/db/schema';
import { hashContent } from '@/lib/engine/operations';

const projectSchema = z.object({ name: z.string().min(1), html: z.string().min(1) });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = projectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_project' }, { status: 400 });
  if (session.isDemo) return NextResponse.json({ id: `demo-${Date.now()}` });
  const result = await getDb().transaction(async (tx) => {
    const [project] = await tx.insert(projects).values({ workspaceId: session.workspaceId, name: parsed.data.name }).returning({ id: projects.id });
    if (!project) throw new Error('project_creation_failed');
    const hash = hashContent(parsed.data.html);
    await tx.insert(fileBlobs).values({ hash, content: parsed.data.html }).onConflictDoNothing();
    await tx.insert(projectFiles).values({ projectId: project.id, path: 'index.html', hash });
    const [version] = await tx.insert(projectVersions).values({ projectId: project.id, createdBy: 'agent', summary: 'Création initiale du projet', filesSnapshot: { 'index.html': hash }, status: 'built' }).returning({ id: projectVersions.id });
    if (!version) throw new Error('version_creation_failed');
    await tx.update(projects).set({ currentVersionId: version.id }).where(eq(projects.id, project.id));
    return project;
  });
  return NextResponse.json(result);
}
