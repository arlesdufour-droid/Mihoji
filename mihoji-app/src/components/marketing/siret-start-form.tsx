'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function SiretStartForm() {
  const router = useRouter();
  const [siret, setSiret] = useState('');
  const [error, setError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const digits = siret.replace(/\s/g, '');
    if (!/^\d{14}$/.test(digits)) {
      setError('Un numéro SIRET comporte 14 chiffres.');
      return;
    }
    router.push(`/login?intent=business&siret=${digits}`);
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-10 w-full max-w-xl" noValidate>
      <label htmlFor="home-siret" className="sr-only">Votre numéro SIRET</label>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-2xl focus-within:border-indigo-400 sm:flex-row">
        <input id="home-siret" inputMode="numeric" autoComplete="off" value={siret} onChange={(event) => { setSiret(event.target.value); setError(''); }} placeholder="Votre numéro SIRET (14 chiffres)" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base text-white placeholder-slate-500 outline-none" />
        <button type="submit" className="rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500">Créer mon site</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
      <p className="mt-4 text-center text-sm"><Link href="/login?intent=business&manual=1" className="text-indigo-300 underline-offset-4 hover:underline">Pas encore de SIRET ? Décrivez votre activité</Link></p>
    </form>
  );
}
