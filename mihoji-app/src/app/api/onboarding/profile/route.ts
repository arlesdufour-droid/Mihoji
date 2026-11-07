import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { companies } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { parseProfile, profileSchema } from '@/lib/site/facts';

// Réponses de l'onboarding (spécialités, ce qui distingue l'entreprise, horaires) : informations réelles, jamais inventées par l'IA.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.isDemo) return NextResponse.json({});
  const [company] = await getDb().select({ profile: companies.profile }).from(companies).where(eq(companies.workspaceId, session.workspaceId)).limit(1);
  return NextResponse.json(parseProfile(company?.profile));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_profile' }, { status: 400 });
  if (session.isDemo) return NextResponse.json(parsed.data);
  const profile = Object.fromEntries(Object.entries(parsed.data).filter(([, value]) => value));
  const updated = await getDb().update(companies).set({ profile }).where(eq(companies.workspaceId, session.workspaceId)).returning({ id: companies.id });
  if (updated.length === 0) return NextResponse.json({ error: 'company_required' }, { status: 400 });
  return NextResponse.json(profile);
}
