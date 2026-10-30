import { NextResponse } from 'next/server';
import { eq, desc, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { abuseReports, creditLedger, publications, subscriptions, supportRequests, users, workspaces } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { z } from 'zod';

const actionSchema = z.object({ action: z.enum(['add_credits', 'suspend_publication']), workspaceId: z.string().uuid().optional(), publicationId: z.string().uuid().optional(), amount: z.number().int().positive().max(100_000_000).optional() });

export async function GET() {
  try { requireAdmin(await getSession()); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }
  const db = getDb();
  const [accounts, spaces, balances, sites, reports, support] = await Promise.all([
    db.select({ id: users.id, email: users.email, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)).limit(200),
    db.select({ id: workspaces.id, name: workspaces.name, ownerId: workspaces.ownerId }).from(workspaces).limit(200),
    db.select({ workspaceId: subscriptions.workspaceId, creditsRemaining: subscriptions.creditsRemaining }).from(subscriptions),
    db.select({ id: publications.id, projectId: publications.projectId, url: publications.url, status: publications.status }).from(publications).orderBy(desc(publications.createdAt)).limit(200),
    db.select().from(abuseReports).orderBy(desc(abuseReports.createdAt)).limit(200),
    db.select().from(supportRequests).orderBy(desc(supportRequests.createdAt)).limit(200),
  ]);
  const shadowCosts = await db.select({ workspaceId: creditLedger.workspaceId, shadowCost: sql<number>`coalesce(sum(${creditLedger.shadowCost}), 0)` }).from(creditLedger).groupBy(creditLedger.workspaceId);
  return NextResponse.json({ accounts, spaces, balances, sites, reports, support, shadowCosts });
}

export async function POST(request: Request) {
  try { requireAdmin(await getSession()); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_admin_action' }, { status: 400 });
  const db = getDb();
  if (parsed.data.action === 'suspend_publication' && parsed.data.publicationId) {
    await db.update(publications).set({ status: 'suspended' }).where(eq(publications.id, parsed.data.publicationId));
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.action === 'add_credits' && parsed.data.workspaceId && parsed.data.amount) {
    const workspaceId = parsed.data.workspaceId;
    const amount = parsed.data.amount;
    await db.transaction(async (tx) => {
      await tx.update(subscriptions).set({ creditsRemaining: sql`${subscriptions.creditsRemaining} + ${amount}` }).where(eq(subscriptions.workspaceId, workspaceId));
      await tx.insert(creditLedger).values({ workspaceId, task: 'admin_credit', model: 'manual', amount, shadowCost: 0, reason: 'admin_manual_credit' });
    });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'invalid_admin_action' }, { status: 400 });
}
