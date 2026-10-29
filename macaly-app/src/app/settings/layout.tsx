import type { ReactNode } from 'react';
import { SettingsSidebar } from '@/components/settings/settings-sidebar';
import { DemoModeBanner } from '@/components/auth/demo-mode-banner';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-slate-950 text-slate-50"><DemoModeBanner /><div className="flex min-h-[calc(100vh-33px)] flex-col lg:flex-row"><SettingsSidebar /><main className="min-w-0 flex-1"><div className="mx-auto max-w-5xl px-5 py-8 md:px-8 lg:py-12">{children}</div></main></div></div>;
}
