import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdmin } from '@/lib/admin';
import { getSession, isUuid } from '@/lib/auth';
import { LlmProviderError } from '@/lib/ai/providers/types';
import { migrateProjectToSite } from '@/lib/site/migrate';

// Recréer un site complet prend une à deux minutes.
export const maxDuration = 300;

const requestSchema = z.object({ projectId: z.string().refine(isUuid) });

// Migration d'un projet de l'ancien format (HTML) vers la description structurée (administrateurs). Équivalent de `npm run sites:migrate`.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.isDemo || !isAdmin(session)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  try {
    const result = await migrateProjectToSite(parsed.data.projectId, { signal: request.signal });
    return NextResponse.json(result, { status: result.status === 'failed' ? 422 : 200 });
  } catch (error) {
    if (error instanceof LlmProviderError && error.code === 'ai_not_configured') return NextResponse.json({ error: 'ai_not_configured' }, { status: 503 });
    if (error instanceof Error && error.message === 'project_not_found') return NextResponse.json({ error: 'project_not_found' }, { status: 404 });
    throw error;
  }
}
