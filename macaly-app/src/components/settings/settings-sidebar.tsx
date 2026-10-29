import Link from 'next/link';
import { Activity, Cable, ChevronRight, CircleUserRound, Globe2, KeyRound, LayoutGrid, Network, Settings, SlidersHorizontal, Users } from 'lucide-react';

const links = [
  { href: '/settings/general', label: 'General', icon: Settings },
  { href: '/settings/preferences', label: 'Preferences', icon: SlidersHorizontal },
  { href: '/settings/members', label: 'Members', icon: Users },
  { href: '/settings/usage', label: 'Usage & Limits', icon: Activity },
  { href: '/settings/domains', label: 'Domains', icon: Globe2 },
  { href: '/settings/connections', label: 'Connections', icon: Cable },
  { href: '/settings/integrations', label: 'Integrations', icon: LayoutGrid },
  { href: '/settings/mcp', label: 'MCP Servers', icon: Network },
  { href: '/settings/billing', label: 'Billing', icon: KeyRound },
];

export function SettingsSidebar() {
  return <aside className="w-full shrink-0 border-b border-slate-800 bg-slate-900/50 p-4 lg:w-64 lg:border-b-0 lg:border-r lg:p-5"><Link href="/studio/demo/preview" className="mb-8 flex items-center gap-2 text-sm font-bold"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">m</span>Mihoji</Link><div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-200">AM</span><div className="min-w-0"><p className="truncate text-sm font-semibold">Alex Morgan</p><p className="truncate text-xs text-slate-500">alex@mihoji.app</p></div></div><p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Workspace</p><nav className="space-y-1">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800/60 hover:text-slate-100"><Icon className="h-4 w-4 text-slate-500 group-hover:text-indigo-300" />{label}<ChevronRight className="ml-auto h-3.5 w-3.5 opacity-0 group-hover:opacity-100" /></Link>)}</nav><div className="mt-8 rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="flex items-center gap-2 text-xs font-medium text-slate-300"><CircleUserRound className="h-3.5 w-3.5 text-indigo-400" />Starter workspace</div><p className="mt-2 text-xs leading-5 text-slate-500">Manage your plan, usage, and project access.</p></div></aside>;
}
