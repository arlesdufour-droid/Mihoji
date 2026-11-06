import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { formatEur } from '@/lib/ai/pricing';
import { compareRuns, type LighthouseScores } from '@/lib/site/benchmark';
import { rubricCriteria } from '@/lib/site/benchmark-rubric';
import { listRuns, readManual, readRun } from '@/lib/site/benchmark-store';
import { RatingInput } from './rating-input';

export const instant = false;

const fileUrl = (run: string, name: string) => `/admin/benchmark/file?${new URLSearchParams({ run, name }).toString()}`;
const eur = (value: number) => formatEur(value);
const sign = (value: number, digits = 2) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;

function Lighthouse({ label, scores }: { label: string; scores?: LighthouseScores }) {
  if (!scores) return null;
  return <p className="text-xs text-slate-400">{label} : performance {scores.performance} · accessibilité {scores.accessibility} · SEO {scores.seo} · bonnes pratiques {scores.bestPractices}</p>;
}

export default async function BenchmarkPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session || !isAdmin(session)) redirect('/');
  const runs = listRuns();
  const params = await searchParams;
  const runId = params.run && runs.includes(params.run) ? params.run : runs[0];
  const results = runId ? readRun(runId) : null;
  if (!runId || !results) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <h1 className="text-3xl font-semibold">Banc d’essai de qualité</h1>
        <p className="mt-4 text-slate-400">Aucune exécution pour l’instant. Lancez <code className="rounded bg-slate-800 px-1">npm run benchmark</code> (vraie IA, environ 0,65 € pour les 12 sites).</p>
        <p className="mt-4"><Link href="/admin/design" className="text-indigo-300 underline">Retour au design des sites</Link></p>
      </main>
    );
  }
  const manual = readManual(runId);
  // Comparaison avec l'exécution précédente de la liste.
  const previousId = runs[runs.indexOf(runId) + 1];
  const previous = previousId ? readRun(previousId) : null;
  const comparison = previous ? compareRuns(previous, results) : null;
  const deltaOf = (id: string) => comparison?.deltas.find((delta) => delta.id === id);
  const { totals, uniformity } = results;
  const manualValues = Object.values(manual);
  const manualMean = manualValues.length ? manualValues.reduce((sum, value) => sum + value, 0) / manualValues.length : null;

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="text-3xl font-semibold">Banc d’essai de qualité</h1>
      <p className="mt-2 max-w-3xl text-slate-400">{totals.sites} sites générés avec les mêmes demandes à chaque exécution, pour comparer avant et après chaque évolution. Les notes du juge IA et vos notes mesurent la qualité ; Lighthouse et les contrôles ci-dessous vérifient seulement que le rendu est correct.</p>
      <p className="mt-3 text-sm"><Link href="/admin/design" className="text-indigo-300 underline">Design des sites</Link></p>

      <nav aria-label="Exécutions" className="mt-6 flex flex-wrap gap-2 text-sm">
        {runs.map((id) => <Link key={id} href={`/admin/benchmark?run=${id}`} aria-current={id === runId ? 'page' : undefined} className={`rounded-lg px-3 py-1.5 ${id === runId ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{id}</Link>)}
      </nav>

      <section aria-label="Exécution" className="mt-6 grid gap-3 rounded-xl border border-slate-700 bg-slate-900 p-5 text-sm md:grid-cols-2">
        <p><span className="text-slate-400">Banc</span> v{results.benchmarkVersion} · <span className="text-slate-400">grille du juge</span> v{results.rubricVersion}</p>
        <p data-testid="benchmark-photos"><span className="text-slate-400">Source des photos</span> : {results.photos === 'local' ? 'bibliothèque locale (comparable)' : 'Unsplash (jugement visuel ponctuel, non comparable)'}</p>
        <p><span className="text-slate-400">Modèle de design</span> {results.provider} · {results.model} · effort {results.effort} · prompt {results.promptHash}</p>
        <p><span className="text-slate-400">Sites réussis</span> {totals.succeeded}/{totals.sites}</p>
        <p data-testid="benchmark-cost"><span className="text-slate-400">Coût</span> génération {eur(totals.generationCostEur)} (moyenne {eur(totals.averageGenerationCostEur)}) · juge {eur(totals.judgeCostEur)} · total {eur(totals.totalCostEur)}</p>
        <p data-testid="benchmark-means"><span className="text-slate-400">Note moyenne du juge</span> {totals.judgeMean ?? '—'}/5 · <span className="text-slate-400">votre note moyenne</span> {manualMean === null ? '—' : `${manualMean.toFixed(2)}/5 (${manualValues.length} site${manualValues.length > 1 ? 's' : ''})`}</p>
      </section>

      <section aria-label="Uniformité" className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-5 text-sm" data-testid="benchmark-uniformity">
        <h2 className="text-lg font-semibold">Uniformité</h2>
        <p className="mt-2">Styles : {Object.entries(uniformity.styles).map(([style, n]) => `${style} ${n}`).join(' · ') || '—'}</p>
        <p className="mt-1 text-slate-400">Palettes : {Object.entries(uniformity.palettes).map(([palette, n]) => `${palette} ${n}`).join(' · ') || '—'}</p>
        <p className="mt-1">{uniformity.sitesInSameSequenceGroup} site{uniformity.sitesInSameSequenceGroup > 1 ? 's' : ''} sur {totals.succeeded} partage{uniformity.sitesInSameSequenceGroup > 1 ? 'nt' : ''} exactement la même suite de sections qu’un autre ({uniformity.distinctSequences} suite{uniformity.distinctSequences > 1 ? 's' : ''} distincte{uniformity.distinctSequences > 1 ? 's' : ''}).</p>
        {uniformity.sameSequenceGroups.map((group) => <p key={group.ids.join('-')} className="mt-1 text-xs text-slate-400">{group.ids.join(', ')} : {group.sequence.join(' › ')}</p>)}
      </section>

      {comparison && previousId ? (
        <section aria-label="Comparaison" className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-5 text-sm" data-testid="benchmark-comparison">
          <h2 className="text-lg font-semibold">Comparaison avec {previousId}</h2>
          {comparison.comparable
            ? <p className="mt-2">Note moyenne du juge : {comparison.judgeMean.before ?? '—'} → {comparison.judgeMean.after ?? '—'}{comparison.judgeMean.before !== null && comparison.judgeMean.after !== null ? ` (${sign(comparison.judgeMean.after - comparison.judgeMean.before)})` : ''} · coût total {eur(comparison.costEur.before)} → {eur(comparison.costEur.after)}</p>
            : <p className="mt-2 text-amber-300">Non comparable : {comparison.reason}.</p>}
        </section>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {results.sites.map((site) => {
          const delta = deltaOf(site.id);
          return (
            <article key={site.id} className="rounded-xl border border-slate-700 bg-slate-900 p-5" data-testid={`site-${site.id}`}>
              <h2 className="text-lg font-semibold">{site.label}</h2>
              <p className="mt-1 text-sm text-slate-400">« {site.request} »</p>
              {site.status === 'failed' ? <p className="mt-3 text-sm text-red-300">Échec de la génération : {site.error}</p> : (
                <>
                  <p className="mt-2 text-sm">{site.style}/{site.palette ?? 'défaut'} · modules : {site.modules?.join(', ') || 'aucun'} · {site.generation.attempts} essai{site.generation.attempts > 1 ? 's' : ''} · {(site.generation.durationMs / 1000).toFixed(0)} s · {eur(site.generation.costEur)}</p>
                  <div className="mt-3 grid grid-cols-[2fr_1fr] gap-3">
                    <a href={fileUrl(runId, `${site.id}.html`)} target="_blank" rel="noreferrer" aria-label={`Ouvrir le site ${site.label}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fileUrl(runId, `${site.id}-ordinateur.jpg`)} alt={`Capture ordinateur : ${site.label}`} loading="lazy" className="h-[420px] w-full rounded-lg border border-slate-700 bg-white object-cover object-top" />
                    </a>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fileUrl(runId, `${site.id}-mobile.jpg`)} alt={`Capture mobile : ${site.label}`} loading="lazy" className="h-[420px] w-full rounded-lg border border-slate-700 bg-white object-cover object-top" />
                  </div>
                  {site.judge?.scores ? (
                    <div className="mt-4" data-testid={`judge-${site.id}`}>
                      <p className="text-sm font-semibold">Juge IA : {site.judge.mean}/5{delta && comparison?.comparable && delta.judgeMean.before !== null && site.judge.mean !== undefined ? ` (${sign(site.judge.mean - delta.judgeMean.before)} vs ${previousId})` : ''}</p>
                      <ul className="mt-1 space-y-1 text-xs text-slate-300">
                        {rubricCriteria.map((criterion) => <li key={criterion.key}><span className="font-semibold">{criterion.label} : {site.judge!.scores![criterion.key].note}/5</span> — {site.judge!.scores![criterion.key].raison}</li>)}
                      </ul>
                    </div>
                  ) : <p className="mt-4 text-sm text-amber-300">Juge IA : {site.judge?.error ?? 'non exécuté'}</p>}
                  <div className="mt-4"><RatingInput runId={runId} siteId={site.id} initial={manual[site.id] ?? null} /></div>
                  {site.checks ? (
                    <div className="mt-4 border-t border-slate-800 pt-3" data-testid={`checks-${site.id}`}>
                      <p className="text-xs font-semibold text-slate-400">Contrôles du rendu (pas des indicateurs de qualité)</p>
                      <p className="text-xs text-slate-400">Ordinateur : débordement {site.checks.desktop.overflow} · contrastes insuffisants {site.checks.desktop.contrastFailures} · images sans alt {site.checks.desktop.imagesWithoutAlt}. Mobile : débordement {site.checks.mobile.overflow} · contrastes insuffisants {site.checks.mobile.contrastFailures}. Images cassées {site.checks.brokenImages} · texte de remplissage {site.checks.filler.length}.</p>
                      <Lighthouse label="Lighthouse mobile" scores={site.lighthouse?.mobile} />
                      <Lighthouse label="Lighthouse ordinateur" scores={site.lighthouse?.desktop} />
                      {site.lighthouse?.error ? <p className="text-xs text-amber-300">Lighthouse : {site.lighthouse.error}</p> : null}
                      {site.photos ? <p className="text-xs text-slate-400">Photos : {site.photos.fromLocal} de la bibliothèque locale, {site.photos.fromCache} du cache, {site.photos.unsplashCalls} appel{site.photos.unsplashCalls > 1 ? 's' : ''} Unsplash{site.photos.unresolved.length ? ` · sans photo : ${site.photos.unresolved.length} requête${site.photos.unresolved.length > 1 ? 's' : ''}` : ''}.</p> : null}
                    </div>
                  ) : null}
                </>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
