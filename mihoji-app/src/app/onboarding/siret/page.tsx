'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SiretPage() {
  const router = useRouter();
  const [siret, setSiret] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    // Le SIRET saisi sur la page d'accueil arrive en paramètre ; le lire au rendu initial provoquerait une erreur d'hydratation.
    const initial = new URLSearchParams(window.location.search).get('siret');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initial && /^\d{14}$/.test(initial)) setSiret(initial);
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const lookup = await fetch(`/api/company/lookup?siret=${encodeURIComponent(siret)}`);
      const company = await lookup.json();
      if (!lookup.ok) throw new Error(company.error ?? 'lookup_failed');
      const response = await fetch('/api/onboarding/company', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(company) });
      if (!response.ok) throw new Error('company_save_failed');
      await fetch('/api/onboarding/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 'confirmation' }) });
      router.push('/onboarding/confirmation');
    } catch (error) {
      setError(error instanceof Error && error.message === 'company_closed' ? 'Cette entreprise est cessée et ne peut pas être utilisée.' : error instanceof Error && error.message === 'lookup_rate_limit' ? 'Trop de recherches, réessayez dans quelques minutes.' : 'Entreprise introuvable ou numéro SIRET invalide.');
    }
  };
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-slate-50"><section className="w-full max-w-xl"><p className="text-sm font-semibold text-indigo-300">Étape 1 sur 3</p><h1 className="mt-4 text-3xl font-bold">Commençons par votre SIRET</h1><p className="mt-3 text-slate-400">Nous récupérons les informations publiques de votre entreprise pour préparer votre site.</p><form onSubmit={submit} className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"><label htmlFor="siret" className="text-sm font-medium">Votre numéro SIRET</label><input id="siret" inputMode="numeric" autoComplete="off" value={siret} onChange={(event) => { setSiret(event.target.value); setError(''); }} placeholder="Ex. 55210055400013" className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-400" />{error && <p className="mt-3 text-sm text-rose-300" role="alert">{error}</p>}<button type="submit" className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold hover:bg-indigo-500">Rechercher mon entreprise</button><Link href="/onboarding/manual" className="mt-4 block text-center text-sm text-indigo-300 hover:text-indigo-200">Je n&apos;ai pas encore de SIRET</Link></form><Link href="/onboarding" className="mt-6 inline-block text-sm text-slate-500 hover:text-slate-300">Retour</Link></section></main>;
}
