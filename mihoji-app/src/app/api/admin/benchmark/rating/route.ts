import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { writeManualRating } from '@/lib/site/benchmark-store';

const bodySchema = z.object({ runId: z.string().max(60), siteId: z.string().max(60), rating: z.number().int().min(1).max(5).nullable() });

// Note manuelle (1 à 5) d'un site du banc d'essai, enregistrée avec l'exécution (manual.json).
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const ratings = writeManualRating(parsed.data.runId, parsed.data.siteId, parsed.data.rating);
  if (!ratings) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ratings });
}
