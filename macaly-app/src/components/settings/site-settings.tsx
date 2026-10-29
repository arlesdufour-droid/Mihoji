'use client';

import { useState } from 'react';
import type { DemoProject } from '@/lib/templates/site';

const warning = 'Ces documents sont des modèles générés automatiquement à partir de vos informations. Ils ne remplacent pas un conseil juridique ; vérifiez-les ou faites-les relire par un professionnel.';

export function SiteSettings({ project }: { project: DemoProject | null }) {
  const [currentProject] = useState<DemoProject | null>(() => {
    if (project || typeof window === 'undefined') return project;
    const stored = window.localStorage.getItem('mihoji-active-project');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as DemoProject;
    } catch {
      window.localStorage.removeItem('mihoji-active-project');
      return null;
    }
  });
  const [company, setCompany] = useState(currentProject?.company ?? null);
  const [missingFields, setMissingFields] = useState<Record<string, string>>(currentProject?.missingFields ?? {});
  const save = () => {
    if (!currentProject || !company) return;
    const next = { ...currentProject, company, missingFields };
    window.localStorage.setItem(`mihoji-project-${currentProject.id}`, JSON.stringify(next));
    window.localStorage.setItem('mihoji-active-project', JSON.stringify(next));
  };
  if (!currentProject || !company) return <p className="text-sm text-slate-400">Aucun site d&apos;entreprise n&apos;a encore été créé.</p>;
  return <div className="space-y-5"><section><p className="text-sm font-medium text-indigo-400">Mon site</p><h1 className="mt-2 text-3xl font-bold">Mes informations</h1><p className="mt-2 text-sm text-slate-400">Ces données sont utilisées sur votre site, vos coordonnées et vos documents de conformité.</p></section><section className="rounded-xl bg-slate-900 p-6 ring-1 ring-slate-800"><div className="grid gap-4 md:grid-cols-2">{([['name', 'Nom de l’entreprise'], ['activity', 'Activité'], ['address', 'Adresse'], ['email', 'Email de contact'], ['phone', 'Téléphone de contact']] as const).map(([key, label]) => <label key={key} className="block text-sm"><span className="text-slate-300">{label}</span><input value={key in company ? company[key as keyof typeof company] : String(missingFields[key] ?? '')} onChange={(event) => key in company ? setCompany({ ...company, [key]: event.target.value }) : setMissingFields({ ...missingFields, [key]: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-400" /></label>)}</div><button type="button" onClick={save} className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold">Enregistrer les modifications</button></section><section className="rounded-xl bg-slate-900 p-6 ring-1 ring-slate-800"><p className="text-sm font-medium text-indigo-400">Conformité</p><h2 className="mt-2 text-xl font-semibold">Mentions légales</h2><p className="mt-2 text-sm text-slate-400">{company.name}, {company.legalForm}, SIREN {company.siren}, {company.address}.</p><p className="mt-4 text-xs leading-5 text-amber-200">{warning}</p><div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">Informations principales renseignées. Les champs obligatoires restants sont vérifiés avant la mise en ligne.</div></section></div>;
}
