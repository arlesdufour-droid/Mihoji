'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CompanyLookup } from '@/lib/company/lookup';

export default function ConfirmationPage() {
  const router = useRouter();
  const [company, setCompany] = useState<CompanyLookup | null>(null);
  useEffect(() => { void fetch('/api/onboarding/company').then((response) => response.ok ? response.json() : null).then((value) => setCompany(value as CompanyLookup | null)); }, []);
  if (!company) return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50"><p>Les informations de l&apos;entreprise sont introuvables.</p></main>;
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-slate-50"><section className="w-full max-w-xl"><p className="text-sm font-semibold text-indigo-300">Étape 2 sur 3</p><h1 className="mt-4 text-3xl font-bold">Vérifiez les informations de votre entreprise</h1><div className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">{[['Dénomination', company.name], ['Forme juridique', company.legalForm], ['Adresse du siège', company.address], ['Activité', company.activity], ['SIRET', company.siret], ['TVA intracommunautaire', company.vatNumber]].map(([label, value]) => <label key={label} className="block text-sm"><span className="text-slate-400">{label}</span><input value={value} onChange={(event) => { if (label === 'Dénomination') setCompany({ ...company, name: event.target.value }); }} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-400" /></label>)}<button type="button" onClick={() => { void fetch('/api/onboarding/company', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(company) }); void fetch('/api/onboarding/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'business', step: 'missing-fields' }) }); router.push('/onboarding/missing-fields'); }} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold hover:bg-indigo-500">Confirmer et continuer</button></div></section></main>;
}
