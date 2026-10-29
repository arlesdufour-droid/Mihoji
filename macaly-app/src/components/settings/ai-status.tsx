import { aiRouter } from '@/lib/ai/router';

export async function AiStatus() {
  const statuses = await aiRouter.getStatus();
  return <section className="rounded-xl bg-slate-900 p-6 ring-1 ring-slate-800">
    <div className="flex items-center justify-between gap-4">
      <div><h2 className="text-sm font-semibold">AI status</h2><p className="mt-1 text-xs text-slate-500">Disponibilité des modèles configurés.</p></div>
      <span className="text-xs text-slate-500">Vérifié {statuses[0] ? new Date(statuses[0].checkedAt).toLocaleString('fr-FR') : 'jamais'}</span>
    </div>
    <div className="mt-5 space-y-3">{statuses.map((status) => <div key={status.model} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm"><span className="font-mono text-xs text-slate-300">{status.model}</span><span className={status.available ? 'text-emerald-300' : 'text-rose-300'}>{status.available ? 'Disponible' : 'Indisponible'}</span></div>)}</div>
  </section>;
}
