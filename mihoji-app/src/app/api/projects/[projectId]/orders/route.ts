import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertProjectAccess, getSession } from '@/lib/auth';
import { cancelOrder, listOrders, markCollected } from '@/lib/orders/service';
import { getRequestOrigin } from '@/lib/site-url';

// Onglet « Commandes » du Studio : liste, retrait effectué, annulation avec remboursement. Réservé à l'espace propriétaire.
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
  const rows = await listOrders(checked.session.workspaceId, projectId);
  return NextResponse.json(rows.map((row) => ({ id: row.id, customerName: row.customerName, customerEmail: row.customerEmail, customerPhone: row.customerPhone, notes: row.notes, lines: row.lines, totalCents: row.totalCents, pickupAt: row.pickupAt, paymentMode: row.paymentMode, paid: Boolean(row.stripePaymentIntentId), status: row.status })));
}

const patch = z.object({ id: z.string().uuid(), action: z.enum(['collected', 'cancel']) });

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const checked = await access(projectId);
  if ('error' in checked) return checked.error;
  const parsed = patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  if (parsed.data.action === 'collected') return (await markCollected(checked.session.workspaceId, projectId, parsed.data.id)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not_found' }, { status: 404 });
  const result = await cancelOrder(checked.session.workspaceId, projectId, parsed.data.id, getRequestOrigin(request));
  return result.ok ? NextResponse.json({ ok: true, refunded: result.refunded }) : NextResponse.json({ error: result.error }, { status: result.error === 'not_found' ? 404 : 502 });
}
