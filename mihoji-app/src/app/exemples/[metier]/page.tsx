import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { MarketingTopBar } from '@/components/marketing/top-bar';
import { injectCompanyData } from '@/lib/company/render';
import { exampleBySlug } from '@/lib/marketing-examples';
import { createDemoProject } from '@/lib/templates/site';

export const instant = false;

export default async function ExamplePage({ params }: { params: Promise<{ metier: string }> }) {
  await connection();
  const { metier } = await params;
  const example = exampleBySlug(metier);
  if (!example) notFound();
  const project = createDemoProject(example.company, {});
  const html = injectCompanyData(project.html, { ...example.company, email: 'contact@exemple.fr', phone: '01 23 45 67 89' });
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <MarketingTopBar audience="business" />
      <main className="mx-auto max-w-5xl px-5 pb-16">
        <p className="text-sm text-slate-400"><Link href="/" className="text-indigo-300 hover:underline">← Tous les exemples</Link></p>
        <h1 className="mt-3 text-3xl font-bold">Exemple : {example.label.toLowerCase()}</h1>
        <p className="mt-2 text-slate-400">Voici le site que Mihoji prépare automatiquement pour une entreprise comme « {example.company.name} » (entreprise fictive). Vous pouvez ensuite tout modifier.</p>
        <iframe title={`Exemple de site : ${example.label}`} srcDoc={`<!doctype html><html lang="fr"><head><script src="https://cdn.tailwindcss.com"></script></head><body>${html}</body></html>`} sandbox="allow-scripts" className="mt-6 h-[560px] w-full rounded-xl border border-slate-800 bg-white" />
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/login?intent=business" className="rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold hover:bg-indigo-500">Créer un site comme celui-ci</Link>
          <Link href="/" className="text-sm text-slate-300 hover:underline">Retour à l’accueil</Link>
        </div>
      </main>
    </div>
  );
}
