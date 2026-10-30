import { BillingView } from '@/components/billing/billing-view';
import { getCreditBalance, getInvoices, getSubscription, getUsageSnapshot } from '@/lib/billing/queries';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function BillingPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const [balance, subscription, usage, invoices] = await Promise.all([getCreditBalance(session.workspaceId), getSubscription(session.workspaceId), getUsageSnapshot(session.workspaceId), getInvoices(session.workspaceId)]);
  return <BillingView balance={balance} subscription={subscription} usage={usage} invoices={invoices} />;
}
