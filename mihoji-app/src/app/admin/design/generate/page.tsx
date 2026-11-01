import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { formatEur } from '@/lib/ai/pricing';
import { designRoute } from '@/lib/ai/routing';
import { generationById, generationSite, recentGenerations } from '@/lib/site/design-service';
import { activeModules, moduleLabels } from '@/lib/site/modules';
import { styles } from '@/lib/site/themes';
import { GenerateForm, RestyleForm } from './generate-form';

export const instant = false;

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' });
const PROVIDERS = { anthropic: 'Anthropic', groq: 'Groq (repli)', mock: 'Simulation', none: 'Non configuré' } as const;

export default async function GeneratePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session || !isAdmin(session)) redirect('/');
  const params = await searchParams;
  const [history, selected] = await Promise.all([recentGenerations(20), params.id ? generationById(params.id) : Promise.resolve(undefined)]);
  const route = designRoute();
  const site = selected ? generationSite(selected) : null;
  const style = site ? styles.find((candidate) => candidate.id === site.theme.style) : undefined;
  const modules = site ? activeModules(site.modules) : [];
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <p className="text-sm"><Link href="/admin/design" className="text-indigo-300 hover:underline">← Design des sites</Link></p>
      <h1 className="mt-2 text-3xl font-semibold">Génération par le modèle de design</h1>
      <p className="mt-2 text-sm text-slate-400">Fournisseur : <span data-testid="design-provider">{PROVIDERS[route.provider]}</span>{'model' in route ? ` · modèle ${route.model}` : ''}</p>

      <section className="mt-6"><GenerateForm /></section>

      {selected && (
        <section className="mt-10" aria-label="Génération sélectionnée">
          <h2 className="text-xl font-semibold">{selected.status === 'succeeded' ? 'Site généré' : 'Génération échouée'}</h2>
          <p className="mt-1 max-w-4xl text-sm text-slate-400">« {selected.request} »</p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div><dt className="inline text-slate-500">Coût : </dt><dd className="inline" data-testid="generation-cost">{formatEur(selected.shadowCostEur)}</dd></div>
            <div><dt className="inline text-slate-500">Modèle : </dt><dd className="inline">{selected.model}</dd></div>
            <div><dt className="inline text-slate-500">Essais : </dt><dd className="inline">{selected.attempts}</dd></div>
            <div><dt className="inline text-slate-500">Durée : </dt><dd className="inline">{Math.round(selected.durationMs / 100) / 10} s</dd></div>
            {style && <div><dt className="inline text-slate-500">Style : </dt><dd className="inline">{style.label}</dd></div>}
            <div><dt className="inline text-slate-500">Modules : </dt><dd className="inline" data-testid="generation-modules">{modules.length ? modules.map((key) => moduleLabels[key]).join(', ') : 'aucun'}</dd></div>
          </dl>
          {selected.error && <p role="alert" className="mt-3 text-sm text-rose-300">{selected.error}</p>}
          {site && (
            <>
              <div className="mt-4"><RestyleForm generationId={selected.id} /></div>
              <iframe title="Site généré" src={`/admin/design/render?generation=${selected.id}`} className="mt-4 h-[80vh] w-full rounded-xl border border-slate-700 bg-white" />
              <details className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs"><summary className="cursor-pointer text-slate-300">Description JSON</summary><pre className="mt-3 max-h-[60vh] overflow-auto text-slate-400">{JSON.stringify(site, null, 2)}</pre></details>
            </>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Dernières générations</h2>
        {history.length === 0 ? <p className="mt-2 text-sm text-slate-500">Aucune génération pour l’instant.</p> : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-2">Date</th><th className="px-3 py-2">Tâche</th><th className="px-3 py-2">Demande</th><th className="px-3 py-2">Modèle</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Coût</th></tr></thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800 text-slate-300">
                    <td className="px-3 py-2 whitespace-nowrap">{dateFormat.format(row.createdAt)}</td>
                    <td className="px-3 py-2">{row.task === 'create' ? 'Création' : 'Style'}</td>
                    <td className="max-w-md truncate px-3 py-2"><Link href={`/admin/design/generate?id=${row.id}`} className="text-indigo-300 hover:underline">{row.request}</Link></td>
                    <td className="px-3 py-2">{row.model}</td>
                    <td className="px-3 py-2">{row.status === 'succeeded' ? 'Réussie' : 'Échouée'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatEur(row.shadowCostEur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
