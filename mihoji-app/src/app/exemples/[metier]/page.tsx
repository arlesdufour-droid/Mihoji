import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { MarketingTopBar } from '@/components/marketing/top-bar';
import { VITRINE_NOTICE } from '@/lib/vitrine/cases';
import { keptEntryBySlug, moduleLabels } from '@/lib/vitrine/store';

export const instant = false;

// Exemple de site : le vrai site rendu par le moteur actuel (description structurée enregistrée dans le dépôt), sur ordinateur puis sur mobile.
export default async function ExamplePage({ params }: { params: Promise<{ metier: string }> }) {
  await connection();
  const { metier } = await params;
  const entry = keptEntryBySlug(metier);
  if (!entry) notFound();
  const src = `/exemples/${entry.slug}/apercu`;
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <MarketingTopBar audience="business" />
      <main className="mx-auto max-w-6xl px-5 pb-16">
        <p className="text-sm text-slate-400"><Link href="/" className="text-indigo-300 hover:underline">← Tous les exemples</Link></p>
        <h1 className="mt-3 text-3xl font-bold">Exemple : {entry.label.replace(/ \(.*\)$/, '').toLowerCase()}</h1>
        <p className="mt-2 max-w-3xl text-slate-400">Voici le site que Mihoji prépare pour une entreprise comme « {entry.company.name} » ({VITRINE_NOTICE.split(' — ')[0].toLowerCase()}). {moduleLabels[entry.module]}. Vous pouvez ensuite tout modifier en écrivant simplement ce que vous voulez.</p>
        <section aria-label="Sur ordinateur" className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Sur ordinateur</h2>
          <iframe title={`Exemple de site : ${entry.label}`} src={src} sandbox="allow-same-origin allow-forms" className="mt-2 h-[640px] w-full rounded-xl border border-slate-800 bg-white" />
        </section>
        <section aria-label="Sur mobile" className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Sur mobile</h2>
          <div className="mt-2 flex justify-center rounded-xl border border-slate-800 bg-slate-900 p-4">
            <iframe title={`Exemple de site sur mobile : ${entry.label}`} src={src} sandbox="allow-same-origin allow-forms" className="h-[760px] w-[390px] max-w-full rounded-[1.6rem] border-[6px] border-slate-700 bg-white" />
          </div>
        </section>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/login?intent=business" className="rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold hover:bg-indigo-500">Créer un site comme celui-ci</Link>
          <Link href="/" className="text-sm text-slate-300 hover:underline">Retour à l’accueil</Link>
        </div>
      </main>
    </div>
  );
}
