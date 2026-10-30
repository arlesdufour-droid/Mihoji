import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { getSession } from '@/lib/auth';
import { onboardingStates } from '@/db/schema';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.isDemo) return NextResponse.json({ kind: null, step: 'kind' });
  const [state] = await getDb().select().from(onboardingStates).where(eq(onboardingStates.workspaceId, session.workspaceId)).limit(1);
  return NextResponse.json(state ?? { kind: null, step: 'kind' });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as { kind?: 'business' | 'agency'; step?: string } | null;
  if (!body?.step || (body.kind !== undefined && body.kind !== 'business' && body.kind !== 'agency')) return NextResponse.json({ error: 'invalid_state' }, { status: 400 });
  if (session.isDemo) return NextResponse.json({ kind: body.kind ?? null, step: body.step });
  const [state] = await getDb().insert(onboardingStates).values({ workspaceId: session.workspaceId, kind: body.kind, step: body.step }).onConflictDoUpdate({ target: onboardingStates.workspaceId, set: { kind: body.kind, step: body.step, updatedAt: new Date() } }).returning();
  return NextResponse.json(state);
}
