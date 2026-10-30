import { UsageView } from '@/components/usage/usage-view';
import { getCreditBalance, getUsageSnapshot } from '@/lib/billing/queries';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const instant = false;

export default async function UsagePage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const [balance, usage] = await Promise.all([getCreditBalance(session.workspaceId), getUsageSnapshot(session.workspaceId)]);
  return <UsageView balance={balance} usage={usage} />;
}
