'use client';

import { useRouter } from 'next/navigation';

export default function ManualCompanyPage() {
  const router = useRouter();
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-slate-50"><section className="w-full max-w-xl"><h1 className="text-3xl font-bold">Saisissez les informations de votre entreprise</h1><p className="mt-3 text-slate-400">Vous pourrez compléter ces informations dans votre Studio.</p><button type="button" onClick={() => router.push('/onboarding/missing-fields')} className="mt-8 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold">Continuer</button></section></main>;
}
