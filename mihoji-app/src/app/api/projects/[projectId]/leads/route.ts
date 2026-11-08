import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertProjectAccess, getSession } from '@/lib/auth';
import { listLeads, setLeadStatus } from '@/lib/leads/service';

// Tableau « Demandes reçues » du Studio : lecture et changement d'état, réservé à l'espace propriétaire du projet.
async function access(projectId: string) {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) } as const;
  try { await assertProjectAccess(session, projectId); } catch { return { error: NextResponse.json({ error: 'project_not_found' }, { status: 404 }) } as const; }
  return { session } as const;
}

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const checked = await access(projectId);
  if ('error' in checked) return checked.error;
  if (checked.session.isDemo) return NextResponse.json([]);
  const rows = await listLeads(checked.session.workspaceId, projectId);
  return NextResponse.json(rows.map((row) => ({ id: row.id, kind: row.kind, name: row.name, email: row.email, phone: row.phone, service: row.service, message: row.message, extra: row.extra, status: row.status, createdAt: row.createdAt })));
}

const patch = z.object({ id: z.string().uuid(), status: z.enum(['new', 'handled']) });

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const checked = await access(projectId);
  if ('error' in checked) return checked.error;
  const parsed = patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const done = await setLeadStatus(checked.session.workspaceId, projectId, parsed.data.id, parsed.data.status);
  return done ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not_found' }, { status: 404 });
}
