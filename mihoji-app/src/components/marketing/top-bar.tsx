import Link from 'next/link';

export type Audience = 'business' | 'agency';

const audiences: { id: Audience; label: string; href: string }[] = [
  { id: 'business', label: 'TPE & indépendants', href: '/' },
  { id: 'agency', label: 'Agences & freelances', href: '/pro' },
];

export function MarketingTopBar({ audience }: { audience: Audience }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
      <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 text-lg">M</span>
        Mihoji
      </Link>
      <nav aria-label="Public" className="order-3 flex w-full justify-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1 sm:order-none sm:w-auto">
        {audiences.map((entry) => (
          <Link key={entry.id} href={entry.href} aria-current={entry.id === audience ? 'page' : undefined} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${entry.id === audience ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>{entry.label}</Link>
        ))}
      </nav>
      <Link href="/login" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">Se connecter</Link>
    </header>
  );
}
