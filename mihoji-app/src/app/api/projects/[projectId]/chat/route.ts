import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { chatMessages } from '@/db/schema';
import { assertProjectAccess, getSession } from '@/lib/auth';
import { z } from 'zod';

const messageSchema = z.object({ messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1) })).min(1) });

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try { await assertProjectAccess(session, projectId); } catch { return NextResponse.json({ error: 'project_not_found' }, { status: 404 }); }
  if (session.isDemo) return NextResponse.json([]);
  const messages = await getDb().select({ role: chatMessages.role, content: chatMessages.content }).from(chatMessages).where(eq(chatMessages.projectId, projectId)).orderBy(asc(chatMessages.createdAt));
  return NextResponse.json(messages);
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try { await assertProjectAccess(session, projectId); } catch { return NextResponse.json({ error: 'project_not_found' }, { status: 404 }); }
  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_messages' }, { status: 400 });
  if (!session.isDemo) {
    await getDb().delete(chatMessages).where(eq(chatMessages.projectId, projectId));
    await getDb().insert(chatMessages).values(parsed.data.messages.map((message) => ({ projectId, ...message })));
  }
  return NextResponse.json({ ok: true });
}
