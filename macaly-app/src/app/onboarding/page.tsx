'use client';

import { Building2, BriefcaseBusiness } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const choose = (kind: 'business' | 'agency') => {
    window.localStorage.setItem('mihoji-workspace-kind', kind);
    window.localStorage.setItem('mihoji-ui-mode', kind === 'business' ? 'simple' : 'expert');
    router.push(kind === 'business' ? '/onboarding/siret' : '/studio/demo/preview');
  };
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-slate-50"><section className="w-full max-w-3xl"><p className="text-sm font-semibold text-indigo-300">Mihoji</p><h1 className="mt-4 text-3xl font-bold md:text-5xl">Vous créez un site pour…</h1><p className="mt-3 text-slate-400">Choisissez votre espace. Vous pourrez le modifier plus tard dans les réglages.</p><div className="mt-8 grid gap-4 md:grid-cols-2"><button type="button" onClick={() => choose('business')} className="flex min-h-64 flex-col items-start rounded-2xl border border-slate-700 bg-slate-900 p-6 text-left transition hover:border-indigo-400 hover:bg-slate-800"><span className="flex h-8 items-center"><Building2 className="h-8 w-8 text-indigo-300" /></span><h2 className="mt-6 text-xl font-semibold">Mon entreprise</h2><p className="mt-2 text-sm text-slate-400">Pour une TPE, un artisan, un commerçant ou une profession libérale.</p></button><button type="button" onClick={() => choose('agency')} className="flex min-h-64 flex-col items-start rounded-2xl border border-slate-700 bg-slate-900 p-6 text-left transition hover:border-indigo-400 hover:bg-slate-800"><span className="flex h-8 items-center"><BriefcaseBusiness className="h-8 w-8 text-indigo-300" /></span><h2 className="mt-6 text-xl font-semibold">Mes clients (agence, freelance)</h2><p className="mt-2 text-sm text-slate-400">Pour créer et livrer des sites à vos clients.</p></button></div></section></main>;
}
