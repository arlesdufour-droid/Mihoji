import { BillingView } from '@/components/billing/billing-view';
import { getCreditBalance, getInvoices, getSubscription, getUsageSnapshot } from '@/lib/billing/queries';

export default async function BillingPage() {
  const [balance, subscription, usage, invoices] = await Promise.all([getCreditBalance('demo-workspace'), getSubscription('demo-workspace'), getUsageSnapshot('demo-workspace'), getInvoices('demo-workspace')]);
  return <BillingView balance={balance} subscription={subscription} usage={usage} invoices={invoices} />;
}
