import 'server-only';

import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { demoCreditBalance, demoSubscription, demoUsage } from '@/lib/billing/demo-data';
import type { CreditBalance, Invoice, UsageSnapshot, Subscription } from '@/lib/billing/types';
import { canUseDemoData } from '@/lib/supabase/config';

function logDatabaseError(operation: string, error: unknown): never {
  console.error(`Billing database error during ${operation}`, error);
  throw new Error(`billing_${operation}_failed`);
}

export const getCreditBalance = cache(async (workspaceId: string): Promise<CreditBalance> => {
  if (canUseDemoData()) return { ...demoCreditBalance };

  try {
    const [subscription] = await getDb().select().from(subscriptions).where(eq(subscriptions.workspaceId, workspaceId)).limit(1);
    if (!subscription) throw new Error('subscription_not_found');
    return {
      remaining: subscription.creditsRemaining,
      used: subscription.creditsUsed,
      monthlyAllowance: subscription.monthlyAllowance,
      resetAt: subscription.periodEnd.toISOString(),
    };
  } catch (error) {
    return logDatabaseError('credit_balance', error);
  }
});

export const getUsageSnapshot = cache(async (workspaceId: string): Promise<UsageSnapshot> => {
  void workspaceId;
  return { ...demoUsage };
});

export const getSubscription = cache(async (workspaceId: string): Promise<Subscription> => {
  if (canUseDemoData()) return { ...demoSubscription };

  try {
    const [subscription] = await getDb().select().from(subscriptions).where(eq(subscriptions.workspaceId, workspaceId)).limit(1);
    if (!subscription) throw new Error('subscription_not_found');
    return { planId: subscription.planId as Subscription['planId'], periodEnd: subscription.periodEnd.toISOString() };
  } catch (error) {
    return logDatabaseError('subscription', error);
  }
});

export const getInvoices = cache(async (workspaceId: string): Promise<Invoice[]> => {
  void workspaceId;
  return [];
});
