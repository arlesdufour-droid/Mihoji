import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { fileBlobs, projectFiles, projectVersions, projects } from '@/db/schema';
import { assertProjectAccess, getSession } from '@/lib/auth';

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try { await assertProjectAccess(session, projectId); } catch { return NextResponse.json({ error: 'project_not_found' }, { status: 404 }); }
  const versions = await getDb().select({ id: projectVersions.id, summary: projectVersions.summary, status: projectVersions.status, createdAt: projectVersions.createdAt, filesSnapshot: projectVersions.filesSnapshot }).from(projectVersions).where(eq(projectVersions.projectId, projectId)).orderBy(desc(projectVersions.createdAt));
  const blobs = await getDb().select({ hash: fileBlobs.hash, content: fileBlobs.content }).from(projectFiles).innerJoin(fileBlobs, eq(projectFiles.hash, fileBlobs.hash)).where(eq(projectFiles.projectId, projectId));
  const contentByHash = new Map(blobs.map((blob) => [blob.hash, blob.content]));
  return NextResponse.json(versions.map((version) => ({ ...version, previewHtml: contentByHash.get((version.filesSnapshot as Record<string, string>)['index.html']) ?? '' })));
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try { await assertProjectAccess(session, projectId); } catch { return NextResponse.json({ error: 'project_not_found' }, { status: 404 }); }
  const body = await request.json().catch(() => null) as { versionId?: string } | null;
  if (!body?.versionId) return NextResponse.json({ error: 'version_required' }, { status: 400 });
  const db = getDb();
  const [version] = await db.select({ snapshot: projectVersions.filesSnapshot }).from(projectVersions).where(and(eq(projectVersions.id, body.versionId), eq(projectVersions.projectId, projectId))).limit(1);
  if (!version) return NextResponse.json({ error: 'version_not_found' }, { status: 404 });
  const snapshot = version.snapshot as Record<string, string>;
  const restored = await db.transaction(async (tx) => {
    for (const [path, hash] of Object.entries(snapshot)) {
      await tx.insert(projectFiles).values({ projectId, path, hash }).onConflictDoUpdate({ target: [projectFiles.projectId, projectFiles.path], set: { hash, updatedAt: new Date() } });
    }
    const [nextVersion] = await tx.insert(projectVersions).values({ projectId, parentVersionId: body.versionId, createdBy: 'user', summary: 'Restauration d’une version précédente', filesSnapshot: snapshot, status: 'built' }).returning({ id: projectVersions.id });
    if (!nextVersion) throw new Error('version_restore_failed');
    await tx.update(projects).set({ currentVersionId: nextVersion.id }).where(eq(projects.id, projectId));
    return nextVersion;
  });
  return NextResponse.json({ ok: true, versionId: restored.id });
}
