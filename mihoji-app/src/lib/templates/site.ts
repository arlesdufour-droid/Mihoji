import type { CompanyLookup } from '@/lib/company/lookup';
import { familyForActivity } from './naf-map';

export type DemoProject = {
  id: string;
  name: string;
  family: ReturnType<typeof familyForActivity>;
  company: CompanyLookup;
  missingFields: Record<string, string>;
  html: string;
  createdAt: string;
};

export function createDemoProject(company: CompanyLookup, missingFields: Record<string, string>): DemoProject {
  const family = familyForActivity(company.activity);
  const name = company.name.trim() || 'Mon entreprise';
  const id = `entreprise-${name.toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'mihoji'}`;
  const html = `<div class="min-h-full bg-white text-slate-900"><header class="bg-indigo-700 px-8 py-16 text-white"><p class="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">{{company.activity}}</p><h1 class="mt-4 text-4xl font-bold">{{company.name}}</h1><p class="mt-4 max-w-2xl text-indigo-100">Un service professionnel, proche de vous.</p></header><main class="space-y-8 p-8"><section><h2 class="text-2xl font-bold">Bienvenue chez {{company.name}}</h2><p class="mt-3 text-slate-600">Découvrez nos services et contactez-nous pour votre projet.</p></section><section class="grid gap-4 md:grid-cols-3"><div class="rounded-xl bg-slate-100 p-5"><p class="text-sm font-semibold text-slate-500">Notre activité</p><p class="mt-2">{{company.activity}}</p></div><div class="rounded-xl bg-slate-100 p-5"><p class="text-sm font-semibold text-slate-500">Adresse</p><p class="mt-2">{{company.address}}</p></div><div class="rounded-xl bg-slate-100 p-5"><p class="text-sm font-semibold text-slate-500">Contact</p><p class="mt-2">{{company.email}}<br />{{company.phone}}</p></div></section></main><footer class="border-t border-slate-200 px-8 py-6 text-sm text-slate-500"><span>{{company.name}}</span> · <a href="/mentions-legales" class="text-indigo-600 underline">Mentions légales</a></footer></div>`;
  return { id, name, family, company, missingFields, html, createdAt: new Date().toISOString() };
}
