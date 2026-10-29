import type { ReactNode } from 'react';
import { SettingsSidebar } from '@/components/settings/settings-sidebar';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50 lg:flex-row"><SettingsSidebar /><main className="min-w-0 flex-1"><div className="mx-auto max-w-5xl px-5 py-8 md:px-8 lg:py-12">{children}</div></main></div>;
}
