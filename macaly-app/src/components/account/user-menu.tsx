'use client';

import Link from 'next/link';
import { Check, CircleHelp, ExternalLink, Gift, LogOut, Settings, Sparkles, UserRound, Wallet, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const [news, setNews] = useState(true);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, [open]);

  return <div className="relative">
    <button ref={trigger} type="button" aria-expanded={open} aria-label="Open account menu" onClick={() => setOpen((value) => !value)} className="relative flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-200 focus-visible:ring-2 focus-visible:ring-indigo-500">m{news && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-400 ring-2 ring-slate-900" />}</button>
    {open && <div ref={menu} role="menu" className="absolute right-0 top-11 z-40 w-72 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-xl shadow-slate-950/70">
      <div className="flex items-center justify-between border-b border-slate-800 p-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 font-bold text-indigo-200">m</span><div><p className="text-sm font-semibold">Alex Morgan</p><p className="text-xs text-slate-500">alex@mihoji.app</p></div></div><button type="button" title="Close menu" onClick={() => setOpen(false)} className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button></div>
      <div className="border-b border-slate-800 py-2"><p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">All workspaces</p><button role="menuitemradio" aria-checked="true" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"><Check className="h-4 w-4 text-indigo-400" />Mihoji workspace<span className="ml-auto rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">Starter</span></button></div>
      <div className="space-y-0.5 border-b border-slate-800 py-2"><Link role="menuitem" href="/settings/general" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"><UserRound className="h-4 w-4 text-slate-500" />View profile</Link><Link role="menuitem" href="/settings/billing" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"><Wallet className="h-4 w-4 text-slate-500" />Billing</Link><Link role="menuitem" href="/settings/preferences" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"><Settings className="h-4 w-4 text-slate-500" />Settings</Link></div>
      <div className="space-y-0.5 border-b border-slate-800 py-2"><button role="menuitem" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"><Gift className="h-4 w-4 text-slate-500" />Refer &amp; earn credits</button><button role="menuitem" onClick={() => setNews(false)} className="flex w-full items-center gap-3 rounded-lg bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200"><Sparkles className="h-4 w-4" />What&apos;s new{news && <span className="ml-auto h-2 w-2 rounded-full bg-indigo-400" />}</button></div>
      <div className="space-y-0.5 py-2"><a role="menuitem" href="https://community.mihoji.app" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"><CircleHelp className="h-4 w-4 text-slate-500" />Community<span className="ml-auto text-[10px] text-indigo-300">New</span></a><a role="menuitem" href="https://docs.mihoji.app" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"><ExternalLink className="h-4 w-4 text-slate-500" />Documentation</a><button role="menuitem" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"><CircleHelp className="h-4 w-4 text-slate-500" />Help</button><button role="menuitem" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"><LogOut className="h-4 w-4" />Sign out</button></div>
    </div>}
  </div>;
}
