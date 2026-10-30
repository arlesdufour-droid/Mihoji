import type { ReactNode } from 'react';
import { SettingsSidebar } from '@/components/settings/settings-sidebar';
import { DemoModeBanner } from '@/components/auth/demo-mode-banner';
import { getLatestProjectPath, getSession } from '@/lib/auth';
import { connection } from 'next/server';

export const instant = false;

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  await connection();
  const session = await getSession();
  const studioPath = session ? await getLatestProjectPath(session) : null;
  return <div className="min-h-screen bg-slate-950 text-slate-50"><DemoModeBanner /><div className="flex min-h-[calc(100vh-33px)] flex-col lg:flex-row"><SettingsSidebar studioPath={studioPath ?? '/onboarding'} email={session?.user.email} workspaceName={session?.workspaceName ?? 'Mon espace'} /><main className="min-w-0 flex-1"><div className="mx-auto max-w-5xl px-5 py-8 md:px-8 lg:py-12">{children}</div></main></div></div>;
}
