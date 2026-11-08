'use client';

import { useCallback, useEffect, useState } from 'react';
import { EXTRA_LABELS } from '@/lib/leads/schema';

type Lead = { id: string; kind: 'quote' | 'contact'; name: string; email: string; phone: string; service: string; message: string; extra: Record<string, string>; status: 'new' | 'handled'; createdAt: string };

// Onglet « Demandes reçues » : devis et messages envoyés par les formulaires du site, avec leur état de traitement.
export function RequestsPanel({ projectId }: { projectId: string }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const load = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/leads`);
    if (response.ok) setLeads(await response.json() as Lead[]);
  }, [projectId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const toggle = async (lead: Lead) => {
    await fetch(`/api/projects/${projectId}/leads`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: lead.id, status: lead.status === 'new' ? 'handled' : 'new' }) });
    await load();
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-xl font-bold">Demandes reçues</h2>
        <p className="mt-2 text-sm text-slate-400">Les devis et messages envoyés depuis les formulaires de votre site arrivent ici, et vous êtes prévenu par email.</p>
        {!leads ? <p className="mt-8 text-sm text-slate-500">Chargement…</p> : leads.length === 0 ? <p className="mt-8 text-sm text-slate-500">Aucune demande pour le moment.</p> : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[40rem] text-left text-sm" aria-label="Demandes reçues">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Demande</th><th className="px-3 py-2">État</th></tr></thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} data-lead={lead.id} className="border-t border-slate-800 align-top">
                    <td className="whitespace-nowrap px-3 py-3 text-slate-400">{new Date(lead.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="px-3 py-3">{lead.kind === 'quote' ? 'Devis' : 'Contact'}</td>
                    <td className="px-3 py-3"><strong>{lead.name}</strong><br /><a className="text-indigo-300 underline" href={`mailto:${lead.email}`}>{lead.email}</a>{lead.phone && <><br /><a className="text-indigo-300 underline" href={`tel:${lead.phone}`}>{lead.phone}</a></>}</td>
                    <td className="px-3 py-3">{lead.service && <p className="font-medium">{lead.service}</p>}<p className="whitespace-pre-wrap text-slate-300">{lead.message}</p>{Object.entries(lead.extra).map(([key, value]) => <p key={key} className="text-xs text-slate-500">{EXTRA_LABELS[key] ?? key} : {value}</p>)}</td>
                    <td className="px-3 py-3"><button type="button" onClick={() => void toggle(lead)} className={`rounded-full px-3 py-1 text-xs font-medium ${lead.status === 'new' ? 'bg-amber-500/15 text-amber-200' : 'bg-emerald-500/15 text-emerald-300'}`} aria-label={lead.status === 'new' ? `Marquer comme traitée : ${lead.name}` : `Remettre à traiter : ${lead.name}`}>{lead.status === 'new' ? 'Nouvelle' : 'Traitée'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
