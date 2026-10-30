import { BillingView } from '@/components/billing/billing-view';
import { getCreditBalance, getInvoices, getSubscription, getUsageSnapshot } from '@/lib/billing/queries';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getLatestProjectPath } from '@/lib/auth';
import { connection } from 'next/server';

export const instant = false;

export default async function BillingPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect('/login');
  const [balance, subscription, usage, invoices, studioPath] = await Promise.all([getCreditBalance(session.workspaceId), getSubscription(session.workspaceId), getUsageSnapshot(session.workspaceId), getInvoices(session.workspaceId), getLatestProjectPath(session)]);
  return <BillingView balance={balance} subscription={subscription} usage={usage} invoices={invoices} studioPath={studioPath ?? '/onboarding'} />;
}
