import { SimpleSettingsPage } from '@/components/settings/simple-settings-page';
import { AiStatus } from '@/components/settings/ai-status';
import { getSession } from '@/lib/auth';
import { SiteSettings } from '@/components/settings/site-settings';

export const instant = false;

export default async function GeneralPage() {
  const session = await getSession();
  return <div className="space-y-8"><SimpleSettingsPage title="General" description="Manage the identity and lifecycle of this workspace." kind="general" /><div id="mon-site"><SiteSettings project={null} /></div>{session?.role === 'owner' && <AiStatus />}</div>;
}
