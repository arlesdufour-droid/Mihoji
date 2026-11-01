const clients = [
  { name: 'Boulangerie Martin', domain: 'boulangerie-martin.fr', status: 'En ligne', tone: 'bg-emerald-500/15 text-emerald-300' },
  { name: 'Dupont Plomberie', domain: 'dupont-plomberie.fr', status: 'En ligne', tone: 'bg-emerald-500/15 text-emerald-300' },
  { name: 'Cabinet Leroy', domain: 'kine-leroy.fr', status: 'À valider', tone: 'bg-amber-500/15 text-amber-300' },
  { name: 'Claire Bernard Conseil', domain: 'claire-bernard.fr', status: 'En préparation', tone: 'bg-slate-500/20 text-slate-300' },
];

// Illustration du tableau de bord clients (données fictives).
export function DashboardPreview() {
  return (
    <figure aria-label="Aperçu du tableau de bord clients" className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-rose-400" /><span className="h-3 w-3 rounded-full bg-amber-400" /><span className="h-3 w-3 rounded-full bg-emerald-400" />
        <span className="ml-3 text-xs text-slate-500">Mon agence — Clients</span>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          {[['12', 'Clients'], ['9', 'Sites en ligne'], ['3', 'À valider']].map(([value, label]) => (
            <div key={label} className="rounded-xl bg-slate-800 p-3"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-slate-400">{label}</p></div>
          ))}
        </div>
        <ul className="mt-4 divide-y divide-slate-800">
          {clients.map((client) => (
            <li key={client.name} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span><span className="block font-medium text-slate-100">{client.name}</span><span className="text-xs text-slate-500">{client.domain}</span></span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${client.tone}`}>{client.status}</span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="border-t border-slate-800 px-5 py-3 text-xs text-slate-500">Exemple avec des clients fictifs.</figcaption>
    </figure>
  );
}
