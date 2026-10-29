import 'server-only';

import { revalidateTag } from 'next/cache';
import { canUseDemoData } from '@/lib/supabase/config';
import { getDb } from '@/db/client';
import { creditLedger, subscriptions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function debitCredits(workspaceId: string, amount: number, reason: string): Promise<void> {
  if (amount < 0 || !Number.isFinite(amount)) throw new Error('Invalid credit debit');
  if (canUseDemoData()) {
    revalidateTag(`credits:${workspaceId}`, 'max');
    return;
  }
  await getDb().transaction(async (tx) => {
    const [subscription] = await tx.select({ remaining: subscriptions.creditsRemaining }).from(subscriptions).where(eq(subscriptions.workspaceId, workspaceId)).limit(1);
    if (!subscription || subscription.remaining < amount) throw new Error('insufficient_credits');
    await tx.update(subscriptions).set({ creditsRemaining: sql`${subscriptions.creditsRemaining} - ${amount}`, creditsUsed: sql`${subscriptions.creditsUsed} + ${amount}` }).where(eq(subscriptions.workspaceId, workspaceId));
    await tx.insert(creditLedger).values({ workspaceId, task: reason, model: 'unknown', amount, shadowCost: amount, reason });
  });
  revalidateTag(`credits:${workspaceId}`, 'max');
}
