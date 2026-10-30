import { SimpleSettingsPage } from '@/components/settings/simple-settings-page';
import { AiStatus } from '@/components/settings/ai-status';
import { getSession } from '@/lib/auth';
import { SiteSettings } from '@/components/settings/site-settings';
import { AccountActions } from '@/components/settings/account-actions';
import { connection } from 'next/server';

export const instant = false;

export default async function GeneralPage() {
  await connection();
  const session = await getSession();
  return <div className="space-y-8"><SimpleSettingsPage title="Général" description="Gérez l’identité et le cycle de vie de cet espace." kind="general" workspaceName={session?.workspaceName} /><div id="mon-site"><SiteSettings project={null} /></div>{session?.role === 'owner' && <AiStatus />}<section className="rounded-xl bg-slate-900 p-6 ring-1 ring-slate-800"><h2 className="text-sm font-semibold">Vos données</h2><p className="mb-4 mt-2 text-xs text-slate-500">Exportez ou supprimez les données de cet espace.</p><AccountActions /></section></div>;
}
