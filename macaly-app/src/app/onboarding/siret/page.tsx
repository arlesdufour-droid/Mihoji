'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { lookupDemoCompany } from '@/lib/company/lookup';

export default function SiretPage() {
  const router = useRouter();
  const [siret, setSiret] = useState('');
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      const company = lookupDemoCompany(siret);
      window.localStorage.setItem('mihoji-company', JSON.stringify(company));
      router.push('/onboarding/confirmation');
    } catch {
      setError('Saisissez un numéro SIRET valide de 14 chiffres.');
    }
  };
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-slate-50"><section className="w-full max-w-xl"><p className="text-sm font-semibold text-indigo-300">Étape 1 sur 3</p><h1 className="mt-4 text-3xl font-bold">Commençons par votre SIRET</h1><p className="mt-3 text-slate-400">Nous récupérons les informations publiques de votre entreprise pour préparer votre site.</p><form onSubmit={submit} className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"><label htmlFor="siret" className="text-sm font-medium">Votre numéro SIRET</label><input id="siret" inputMode="numeric" autoComplete="off" value={siret} onChange={(event) => { setSiret(event.target.value); setError(''); }} placeholder="Ex. 55210055400013" className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-400" />{error && <p className="mt-3 text-sm text-rose-300" role="alert">{error}</p>}<button type="submit" className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold hover:bg-indigo-500">Rechercher mon entreprise</button><Link href="/onboarding/manual" className="mt-4 block text-center text-sm text-indigo-300 hover:text-indigo-200">Je n&apos;ai pas encore de SIRET</Link></form><Link href="/onboarding" className="mt-6 inline-block text-sm text-slate-500 hover:text-slate-300">Retour</Link></section></main>;
}
