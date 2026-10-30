import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { abuseReports, publications } from '@/db/schema';
import { eq } from 'drizzle-orm';

const requestSchema = z.object({ reason: z.string().trim().min(3).max(500), reporterEmail: z.string().email().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ publicationId: string }> }) {
  const { publicationId } = await params;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_report' }, { status: 400 });
  const [publication] = await getDb().select({ id: publications.id }).from(publications).where(eq(publications.id, publicationId)).limit(1);
  if (!publication) return NextResponse.json({ error: 'publication_not_found' }, { status: 404 });
  await getDb().insert(abuseReports).values({ publicationId, reason: parsed.data.reason, reporterEmail: parsed.data.reporterEmail });
  return NextResponse.json({ ok: true });
}
