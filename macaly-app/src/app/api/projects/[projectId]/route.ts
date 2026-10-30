import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { fileBlobs, projectFiles, projects } from '@/db/schema';
import { assertProjectAccess, getSession } from '@/lib/auth';

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    await assertProjectAccess(session, projectId);
  } catch {
    return NextResponse.json({ error: 'project_not_found' }, { status: 404 });
  }
  if (session.isDemo) return NextResponse.json(null);
  const [project] = await getDb().select({ id: projects.id, name: projects.name }).from(projects).where(and(eq(projects.id, projectId), eq(projects.workspaceId, session.workspaceId))).limit(1);
  if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 });
  const files = await getDb().select({ path: projectFiles.path, content: fileBlobs.content }).from(projectFiles).innerJoin(fileBlobs, eq(projectFiles.hash, fileBlobs.hash)).where(eq(projectFiles.projectId, projectId));
  return NextResponse.json({ ...project, html: files.find((file) => file.path === 'index.html')?.content ?? '' });
}
