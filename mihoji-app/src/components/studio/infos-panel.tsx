'use client';

import { useCallback, useEffect, useState } from 'react';

type Hours = { rows: { day: string; hours: string }[]; note?: string };
type Stats = { items: { value: string; label: string }[] };

const errorMessages: Record<string, string> = {
  two_required: 'Renseignez au moins deux chiffres (valeur et description), ou videz toutes les lignes pour retirer la section.',
  structured_site_required: 'Ce site doit d’abord être recréé au nouveau format.',
  database_required: 'Cette fonction n’est pas disponible en mode démonstration.',
};

const field = 'mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm';

// Onglet « Horaires et chiffres » du Studio : formulaires dédiés, sans passer par le chat. Seules des données réelles y sont saisies.
export function InfosPanel({ projectId, onApplied }: { projectId: string; onApplied: () => void }) {
  const [hours, setHours] = useState<Hours | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string; scope: 'hours' | 'stats' } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/real-data`);
    if (!response.ok) return;
    const value = await response.json() as { hours: Hours; stats: Stats };
    setHours(value.hours);
    setStats(value.stats);
  }, [projectId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const save = async (scope: 'hours' | 'stats') => {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/projects/${projectId}/real-data`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scope === 'hours' ? { hours } : { stats }) });
    if (response.ok) {
      setMessage({ scope, tone: 'ok', text: 'Enregistré. Une nouvelle version du site a été créée ; retrouvez-la dans l’aperçu et dans l’historique.' });
      onApplied();
    } else {
      const body = await response.json().catch(() => ({})) as { error?: string };
      setMessage({ scope, tone: 'error', text: errorMessages[body.error ?? ''] ?? 'L’enregistrement n’a pas abouti. Vérifiez les champs puis réessayez.' });
    }
    setBusy(false);
  };

  if (!hours || !stats) return <div className="p-6 text-sm text-slate-400">Chargement…</div>;
  const status = (scope: 'hours' | 'stats') => message?.scope === scope && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-xl p-3 text-sm ${message.tone === 'error' ? 'bg-rose-500/10 text-rose-200' : 'bg-emerald-500/10 text-emerald-200'}`}>{message.text}</p>;

  return (
    <div className="mx-auto h-full max-w-3xl overflow-auto p-6 text-slate-100">
      <h2 className="text-xl font-bold">Horaires et chiffres clés</h2>
      <p className="mt-2 text-sm text-slate-400">Ces informations sont affichées sur votre site telles que vous les saisissez. Mihoji n’en invente jamais : laissez un champ vide si l’information n’existe pas.</p>

      <form className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5" aria-label="Horaires d’ouverture" onSubmit={(event) => { event.preventDefault(); void save('hours'); }}>
        <h3 className="font-semibold">Horaires d’ouverture</h3>
        <p className="mt-1 text-xs text-slate-400">Ex. « 8 h – 19 h » ou « Fermé ». Un jour laissé vide n’est pas affiché.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {hours.rows.map((row, index) => (
            <label key={row.day} className="block text-sm"><span className="text-slate-300">{row.day}</span>
              <input value={row.hours} maxLength={40} disabled={busy} onChange={(event) => setHours({ ...hours, rows: hours.rows.map((entry, position) => position === index ? { ...entry, hours: event.target.value } : entry) })} className={field} />
            </label>
          ))}
          <label className="block text-sm sm:col-span-2"><span className="text-slate-300">Remarque (facultatif)</span>
            <input value={hours.note ?? ''} maxLength={170} disabled={busy} placeholder="Ex. Fermé les jours fériés" onChange={(event) => setHours({ ...hours, note: event.target.value })} className={field} />
          </label>
        </div>
        {status('hours')}
        <button type="submit" disabled={busy} className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50">Enregistrer les horaires</button>
      </form>

      <form className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5" aria-label="Chiffres clés" onSubmit={(event) => { event.preventDefault(); void save('stats'); }}>
        <h3 className="font-semibold">Chiffres clés</h3>
        <p className="mt-1 text-xs text-slate-400">De 2 à 4 chiffres vrais et vérifiables (ex. « 2008 » – « année de création », « 350 » – « chantiers réalisés »). Videz tout pour retirer la section.</p>
        <div className="mt-4 grid gap-3">
          {stats.items.map((item, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-[9rem_1fr]">
              <label className="block text-sm"><span className="text-slate-300">Chiffre {index + 1}</span>
                <input value={item.value} maxLength={14} disabled={busy} placeholder="Ex. 350" onChange={(event) => setStats({ items: stats.items.map((entry, position) => position === index ? { ...entry, value: event.target.value } : entry) })} className={field} />
              </label>
              <label className="block text-sm"><span className="text-slate-300">Description {index + 1}</span>
                <input value={item.label} maxLength={50} disabled={busy} placeholder="Ex. chantiers réalisés" onChange={(event) => setStats({ items: stats.items.map((entry, position) => position === index ? { ...entry, label: event.target.value } : entry) })} className={field} />
              </label>
            </div>
          ))}
        </div>
        {status('stats')}
        <button type="submit" disabled={busy} className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50">Enregistrer les chiffres clés</button>
      </form>
    </div>
  );
}
