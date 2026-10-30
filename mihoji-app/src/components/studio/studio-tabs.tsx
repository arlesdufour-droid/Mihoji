'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { simpleStudioTabIds, studioTabs } from '@/lib/studio-tabs';

export function StudioTabs({ projectId, mode }: { projectId: string; mode: 'simple' | 'expert' }) {
  const pathname = usePathname();
  const active = pathname.split('/').pop() || 'preview';
  return <nav className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-xl bg-slate-900 p-1 ring-1 ring-slate-800" aria-label="Studio navigation">
    {studioTabs.filter(({ id }) => mode === 'expert' || simpleStudioTabIds.includes(id)).map(({ id, label, icon: Icon }) => <Link key={id} href={`/studio/${projectId}/${id}`} aria-current={active === id ? 'page' : undefined} title={label} className={cn('flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500', active === id ? 'bg-slate-800 text-slate-50' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200')}><Icon className={cn('h-4 w-4', active === id ? 'text-indigo-400' : 'text-slate-500')} aria-hidden="true" /><span className="hidden md:inline">{label}</span></Link>)}
  </nav>;
}
