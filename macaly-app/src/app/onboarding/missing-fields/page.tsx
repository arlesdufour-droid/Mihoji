'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDemoProject } from '@/lib/templates/site';
import type { CompanyLookup } from '@/lib/company/lookup';

export default function MissingFieldsPage() {
  const router = useRouter();
  const [fields, setFields] = useState({ capital: '', registry: '', director: '', email: '', phone: '' });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    window.localStorage.setItem('mihoji-company-missing-fields', JSON.stringify(fields));
    window.localStorage.setItem('mihoji-onboarding-complete', 'true');
    const storedCompany = window.localStorage.getItem('mihoji-company');
    if (!storedCompany) {
      router.push('/onboarding/siret');
      return;
    }
    const project = createDemoProject(JSON.parse(storedCompany) as CompanyLookup, fields);
    window.localStorage.setItem(`mihoji-project-${project.id}`, JSON.stringify(project));
    window.localStorage.setItem('mihoji-active-project', JSON.stringify(project));
    window.localStorage.setItem('mihoji-ui-mode', 'simple');
    router.push(`/studio/${project.id}/preview`);
  };
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-slate-50"><section className="w-full max-w-xl"><p className="text-sm font-semibold text-indigo-300">Étape 3 sur 3</p><h1 className="mt-4 text-3xl font-bold">Complétez les informations de votre site</h1><p className="mt-3 text-slate-400">Ces informations sont nécessaires pour vos mentions légales et votre page de contact.</p><form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">{[['capital', 'Capital social'], ['registry', 'Numéro RCS ou RM'], ['director', 'Directeur de la publication'], ['email', 'Email de contact'], ['phone', 'Téléphone de contact']].map(([key, label]) => <label key={key} className="block text-sm"><span className="text-slate-300">{label}</span><input required={key === 'email'} type={key === 'email' ? 'email' : 'text'} value={fields[key as keyof typeof fields]} onChange={(event) => setFields({ ...fields, [key]: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-400" /></label>)}<button type="submit" className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold hover:bg-indigo-500">Terminer et ouvrir mon Studio</button></form></section></main>;
}
