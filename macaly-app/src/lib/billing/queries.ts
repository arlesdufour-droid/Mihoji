import 'server-only';

import { cache } from 'react';
import { demoCreditBalance, demoInvoices, demoSubscription, demoUsage } from '@/lib/billing/demo-data';
import type { CreditBalance, Invoice, UsageSnapshot, Subscription } from '@/lib/billing/types';

export const getCreditBalance = cache(async (workspaceId: string): Promise<CreditBalance> => { void workspaceId; return { ...demoCreditBalance }; });
export const getUsageSnapshot = cache(async (workspaceId: string): Promise<UsageSnapshot> => { void workspaceId; return { ...demoUsage }; });
export const getSubscription = cache(async (workspaceId: string): Promise<Subscription> => { void workspaceId; return { ...demoSubscription }; });
export const getInvoices = cache(async (workspaceId: string): Promise<Invoice[]> => { void workspaceId; return demoInvoices.map((invoice) => ({ ...invoice })); });
