'use client';

import { useCallback, useEffect, useState } from 'react';

type Order = { id: string; customerName: string; customerEmail: string; customerPhone: string; notes: string; lines: { name: string; unitCents: number; quantity: number }[]; totalCents: number; pickupAt: string; paymentMode: 'online' | 'on_pickup'; paid: boolean; status: 'confirmed' | 'collected' | 'cancelled' | 'refunded' };
const euros = (cents: number) => `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: cents % 100 ? 2 : 0 })} €`;
const labels = { collected: 'Retirée', cancelled: 'Annulée', refunded: 'Annulée et remboursée' } as const;

// Onglet « Commandes » : commandes click & collect du site, retrait effectué, annulation avec remboursement (paiement direct sur le compte Stripe du commerçant).
export function OrdersPanel({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Order[] | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const load = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/orders`);
    if (response.ok) setItems(await response.json() as Order[]);
  }, [projectId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const act = async (order: Order, action: 'collected' | 'cancel') => {
    const response = await fetch(`/api/projects/${projectId}/orders`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: order.id, action }) });
    const body = await response.json().catch(() => ({})) as { refunded?: boolean };
    setMessage(response.ok ? { tone: 'ok', text: action === 'collected' ? `Commande de ${order.customerName} marquée comme retirée.` : body.refunded ? `Commande de ${order.customerName} annulée : le paiement a été remboursé.` : `Commande de ${order.customerName} annulée.` } : { tone: 'error', text: 'L’action a échoué (le remboursement n’a pas pu être fait). Réessayez.' });
    await load();
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-xl font-bold">Commandes</h2>
        <p className="mt-2 text-sm text-slate-400">Les commandes à retirer en boutique passées sur votre site. Les paiements en ligne sont versés directement sur votre compte Stripe.</p>
        {message && <p role="status" className={`mt-4 text-sm ${message.tone === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>{message.text}</p>}
        {!items ? <p className="mt-8 text-sm text-slate-500">Chargement…</p> : items.length === 0 ? <p className="mt-8 text-sm text-slate-500">Aucune commande pour le moment.</p> : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[44rem] text-left text-sm" aria-label="Commandes">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400"><tr><th className="px-3 py-2">Retrait</th><th className="px-3 py-2">Client</th><th className="px-3 py-2">Commande</th><th className="px-3 py-2">Paiement</th><th className="px-3 py-2">État</th></tr></thead>
              <tbody>
                {items.map((order) => (
                  <tr key={order.id} data-order={order.id} className="border-t border-slate-800 align-top">
                    <td className="whitespace-nowrap px-3 py-3">{new Date(order.pickupAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="px-3 py-3"><strong>{order.customerName}</strong><br /><a className="text-indigo-300 underline" href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a>{order.customerPhone && <><br />{order.customerPhone}</>}{order.notes && <p className="mt-1 text-xs text-slate-500">{order.notes}</p>}</td>
                    <td className="px-3 py-3"><ul>{order.lines.map((line) => <li key={line.name}>{line.quantity} × {line.name}</li>)}</ul><p className="mt-1 text-xs text-slate-500">Total {euros(order.totalCents)}</p></td>
                    <td className="px-3 py-3">{order.paid ? 'Payée en ligne' : 'À encaisser au retrait'}</td>
                    <td className="px-3 py-3">
                      {order.status === 'confirmed' ? (
                        <div className="flex flex-col items-start gap-2">
                          <button type="button" onClick={() => void act(order, 'collected')} className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25" aria-label={`Marquer la commande de ${order.customerName} comme retirée`}>À retirer — marquer retirée</button>
                          <button type="button" onClick={() => void act(order, 'cancel')} className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-200 hover:bg-red-500/20" aria-label={`Annuler la commande de ${order.customerName}${order.paid ? ' et rembourser' : ''}`}>{order.paid ? 'Annuler et rembourser' : 'Annuler'}</button>
                        </div>
                      ) : <span className="text-slate-400">{labels[order.status]}</span>}
                    </td>
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
