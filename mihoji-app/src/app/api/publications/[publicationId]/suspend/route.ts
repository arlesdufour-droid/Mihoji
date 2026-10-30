import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { publications } from '@/db/schema';
import { assertProjectAccess, getSession } from '@/lib/auth';

export async function POST(_request: Request, { params }: { params: Promise<{ publicationId: string }> }) {
  const { publicationId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const [publication] = await getDb().select({ projectId: publications.projectId }).from(publications).where(eq(publications.id, publicationId)).limit(1);
  if (!publication) return NextResponse.json({ error: 'publication_not_found' }, { status: 404 });
  try { await assertProjectAccess(session, publication.projectId); } catch { return NextResponse.json({ error: 'publication_not_found' }, { status: 404 }); }
  await getDb().update(publications).set({ status: 'suspended' }).where(eq(publications.id, publicationId));
  return NextResponse.json({ ok: true, message: 'Site suspendu' });
}
