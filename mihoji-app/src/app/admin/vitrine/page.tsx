import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { formatEur } from '@/lib/ai/pricing';
import { VITRINE_NOTICE, vitrineCases } from '@/lib/vitrine/cases';
import { listVitrineEntries, parseDescription, readKeep } from '@/lib/vitrine/store';
import { KeepToggle } from './keep-toggle';

export const instant = false;

const moduleLabels = { quote: 'Demande de devis', 'booking-deposit': 'Rendez-vous avec acompte', booking: 'Rendez-vous', shop: 'Petite boutique (click & collect)' } as const;
const previewUrl = (slug: string) => `/admin/vitrine/preview/${slug}`;

// Choix des sites d'exemple de la vitrine de la page d'accueil : les 8 sites côte à côte, en version ordinateur et mobile (administrateurs seulement).
export default async function VitrinePage() {
  await connection();
  const session = await getSession();
  if (!session || !isAdmin(session)) redirect('/');
  const entries = listVitrineEntries();
  const keep = readKeep();
  const total = entries.reduce((sum, entry) => sum + entry.costEur, 0);
  const kept = entries.filter((entry) => keep[entry.slug]).length;

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="text-3xl font-semibold">Vitrine de la page d’accueil</h1>
      <p className="mt-2 max-w-3xl text-slate-400">Sites d’exemple créés par la vraie IA pour des entreprises <strong>fictives</strong> (« {VITRINE_NOTICE} »), rendus avec le moteur actuel des sites. Cochez « Garder » pour ceux qui doivent figurer sur la page d’accueil. Les choix sont enregistrés dans le dépôt.</p>
      <p className="mt-3 text-sm text-slate-300" data-testid="vitrine-summary">{entries.length} site{entries.length > 1 ? 's' : ''} sur {vitrineCases.length} · {kept} gardé{kept > 1 ? 's' : ''} · coût de génération {formatEur(total)}</p>
      <p className="mt-2 text-sm"><Link href="/admin/design" className="text-indigo-300 underline">Design des sites</Link> · <Link href="/admin/benchmark" className="text-indigo-300 underline">Banc d’essai</Link></p>

      {entries.length === 0 ? (
        <p className="mt-8 text-slate-400">Aucun site pour l’instant. Lancez <code className="rounded bg-slate-800 px-1">npm run vitrine:generate</code> (vraie IA, environ 0,05 € par site).</p>
      ) : (
        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          {entries.map((entry) => {
            const description = parseDescription(entry);
            const sections = description.pages[0].sections.length;
            return (
              <article key={entry.slug} data-testid={`vitrine-${entry.slug}`} className="rounded-xl border border-slate-700 bg-slate-900 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{entry.label}</h2>
                    <p className="text-sm text-slate-300">{entry.company.name} <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-200">entreprise fictive</span></p>
                  </div>
                  <KeepToggle slug={entry.slug} label={entry.label} initial={Boolean(keep[entry.slug])} />
                </div>
                <p className="mt-2 text-sm text-slate-400">« {entry.request} »</p>
                <p className="mt-2 text-xs text-slate-400">{moduleLabels[entry.module]} · style {description.theme.style}{description.theme.palette ? `/${description.theme.palette}` : ''} · {sections} sections · {entry.photos} photo{entry.photos > 1 ? 's' : ''} hébergée{entry.photos > 1 ? 's' : ''} · {formatEur(entry.costEur)} · {entry.attempts} essai{entry.attempts > 1 ? 's' : ''}</p>
                <div className="mt-4 flex flex-wrap items-start gap-4">
                  <div>
                    <p className="mb-1 text-xs uppercase text-slate-400">Ordinateur</p>
                    <div className="h-[430px] w-[640px] max-w-full overflow-hidden rounded-lg border border-slate-700 bg-white">
                      <iframe src={previewUrl(entry.slug)} title={`Aperçu ordinateur : ${entry.label}`} sandbox="allow-same-origin" loading="lazy" className="h-[860px] w-[1280px] origin-top-left scale-50 border-0" />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs uppercase text-slate-400">Mobile</p>
                    <div className="h-[430px] w-[200px] overflow-hidden rounded-lg border border-slate-700 bg-white">
                      <iframe src={previewUrl(entry.slug)} title={`Aperçu mobile : ${entry.label}`} sandbox="allow-same-origin" loading="lazy" className="h-[860px] w-[390px] origin-top-left scale-50 border-0" />
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm"><a href={previewUrl(entry.slug)} target="_blank" rel="noreferrer" className="text-indigo-300 underline">Ouvrir le site en grand</a></p>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
