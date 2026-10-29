import { UsageView } from '@/components/usage/usage-view';
import { getCreditBalance, getUsageSnapshot } from '@/lib/billing/queries';

export default async function UsagePage() {
  const [balance, usage] = await Promise.all([getCreditBalance('demo-workspace'), getUsageSnapshot('demo-workspace')]);
  return <UsageView balance={balance} usage={usage} />;
}
