import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { writeKeep } from '@/lib/vitrine/store';

const bodySchema = z.object({ slug: z.string().max(40), keep: z.boolean() });

// Case « garder » d'un site d'exemple de la vitrine, enregistrée dans src/content/vitrine/keep.json (administrateurs ; disque du serveur de développement).
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  try {
    const choices = writeKeep(parsed.data.slug, parsed.data.keep);
    return choices ? NextResponse.json({ choices }) : NextResponse.json({ error: 'not_found' }, { status: 404 });
  } catch (error) {
    console.error('Vitrine keep choice could not be written.', error);
    return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  }
}
