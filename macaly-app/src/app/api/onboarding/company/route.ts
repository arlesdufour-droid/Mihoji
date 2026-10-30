import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { companies } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const companySchema = z.object({
  siret: z.string().regex(/^\d{14}$/),
  siren: z.string().regex(/^\d{9}$/),
  name: z.string().min(1),
  legalForm: z.string().min(1),
  address: z.string().min(1),
  activity: z.string().min(1),
  createdAt: z.string().min(1),
  vatNumber: z.string().min(1),
  status: z.enum(['active', 'closed']),
  missingFields: z.record(z.string(), z.string()).default({}),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.isDemo) return NextResponse.json(null);
  const [company] = await getDb().select().from(companies).where(eq(companies.workspaceId, session.workspaceId)).limit(1);
  return NextResponse.json(company ?? null);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = companySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_company' }, { status: 400 });
  if (session.isDemo) return NextResponse.json(parsed.data);
  const { createdAt, ...companyData } = parsed.data;
  const values = { ...companyData, createdAt: new Date(createdAt), workspaceId: session.workspaceId };
  const [company] = await getDb().insert(companies).values(values).onConflictDoUpdate({ target: companies.workspaceId, set: companyData }).returning();
  return NextResponse.json(company);
}
