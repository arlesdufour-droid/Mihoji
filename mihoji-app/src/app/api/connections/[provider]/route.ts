import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { connectorById } from '@/lib/connectors/registry';
import { verifyCredentials } from '@/lib/connectors/providers';
import { removeConnection, saveConnection } from '@/lib/connectors/store';
import { consumeRateLimit } from '@/lib/rate-limit';

const body = z.object({ secret: z.string().trim().min(8).max(400) });

// Brancher un outil à clé d'API : la clé est vérifiée auprès du service, puis chiffrée en base. Réservé à l'espace connecté.
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.isDemo) return NextResponse.json({ error: 'database_required' }, { status: 422 });
  const { provider } = await params;
  const definition = connectorById(provider);
  if (!definition) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (definition.status !== 'available' || definition.auth !== 'api_key') return NextResponse.json({ error: 'unsupported' }, { status: 422 });
  if (!(await consumeRateLimit(`connections:${session.workspaceId}`, 20, 60 * 60 * 1000))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const verified = await verifyCredentials(provider, parsed.data.secret);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.error === 'unavailable' ? 502 : 422 });
  await saveConnection({ workspaceId: session.workspaceId, provider, secret: parsed.data.secret, accountLabel: verified.accountLabel, scopes: verified.scopes });
  return NextResponse.json({ connected: true, accountLabel: verified.accountLabel }, { status: 201 });
}

// Déconnexion à tout moment : le jeton chiffré est supprimé.
export async function DELETE(_request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { provider } = await params;
  if (!connectorById(provider)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const removed = await removeConnection(session.workspaceId, provider);
  return removed ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not_found' }, { status: 404 });
}
