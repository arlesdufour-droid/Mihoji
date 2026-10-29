import { SimpleSettingsPage } from '@/components/settings/simple-settings-page';
import { AiStatus } from '@/components/settings/ai-status';
import { getSession } from '@/lib/auth';

export default async function GeneralPage() {
  const session = await getSession();
  return <div className="space-y-8"><SimpleSettingsPage title="General" description="Manage the identity and lifecycle of this workspace." kind="general" />{session?.role === 'owner' && <AiStatus />}</div>;
}
