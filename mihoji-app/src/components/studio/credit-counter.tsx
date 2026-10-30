'use client';

import Link from 'next/link';
import { Coins } from 'lucide-react';
import { formatCredits, formatCreditsInMillions } from '@/lib/format';

export function CreditCounter({ remaining }: { remaining: number }) {
  return <Link href="/settings/billing" title={`${formatCredits(remaining)} crédits restants`} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><Coins className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" /><span className="tabular-nums">{formatCreditsInMillions(remaining)}</span></Link>;
}
