'use client';

import { useCallback, useEffect, useState } from 'react';

type Booking = { id: string; service: string; startsAt: string; durationMinutes: number; customerName: string; customerEmail: string; customerPhone: string; notes: string; totalCents: number; paidCents: number; status: 'confirmed' | 'cancelled' | 'refunded' };
const euros = (cents: number) => `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: cents % 100 ? 2 : 0 })} €`;
const labels = { confirmed: 'Confirmé', cancelled: 'Annulé', refunded: 'Annulé et remboursé' } as const;

// Onglet « Rendez-vous » : rendez-vous pris sur le site, acompte payé directement sur le compte Stripe du commerçant, annulation avec remboursement.
export function BookingsPanel({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Booking[] | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const load = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/bookings`);
    if (response.ok) setItems(await response.json() as Booking[]);
  }, [projectId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const cancel = async (booking: Booking) => {
    const response = await fetch(`/api/projects/${projectId}/bookings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: booking.id, action: 'cancel' }) });
    const body = await response.json().catch(() => ({})) as { refunded?: boolean };
    setMessage(response.ok ? { tone: 'ok', text: body.refunded ? `Rendez-vous de ${booking.customerName} annulé : l’acompte a été remboursé.` : `Rendez-vous de ${booking.customerName} annulé.` } : { tone: 'error', text: 'L’annulation a échoué (le remboursement n’a pas pu être fait). Réessayez.' });
    await load();
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-xl font-bold">Rendez-vous</h2>
        <p className="mt-2 text-sm text-slate-400">Les rendez-vous pris sur votre site. Les acomptes sont versés directement sur votre compte Stripe.</p>
        {message && <p role="status" className={`mt-4 text-sm ${message.tone === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>{message.text}</p>}
        {!items ? <p className="mt-8 text-sm text-slate-500">Chargement…</p> : items.length === 0 ? <p className="mt-8 text-sm text-slate-500">Aucun rendez-vous pour le moment.</p> : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[40rem] text-left text-sm" aria-label="Rendez-vous">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Client</th><th className="px-3 py-2">Prestation</th><th className="px-3 py-2">Paiement</th><th className="px-3 py-2">État</th></tr></thead>
              <tbody>
                {items.map((booking) => (
                  <tr key={booking.id} data-booking={booking.id} className="border-t border-slate-800 align-top">
                    <td className="whitespace-nowrap px-3 py-3">{new Date(booking.startsAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="px-3 py-3"><strong>{booking.customerName}</strong><br /><a className="text-indigo-300 underline" href={`mailto:${booking.customerEmail}`}>{booking.customerEmail}</a>{booking.customerPhone && <><br />{booking.customerPhone}</>}{booking.notes && <p className="mt-1 text-xs text-slate-500">{booking.notes}</p>}</td>
                    <td className="px-3 py-3">{booking.service}<br /><span className="text-xs text-slate-500">{booking.durationMinutes} min{booking.totalCents ? ` · ${euros(booking.totalCents)}` : ''}</span></td>
                    <td className="px-3 py-3">{booking.paidCents ? `Acompte payé : ${euros(booking.paidCents)}` : booking.totalCents ? 'À régler sur place' : 'Gratuit'}</td>
                    <td className="px-3 py-3">{booking.status === 'confirmed' ? <button type="button" onClick={() => void cancel(booking)} className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300 hover:bg-red-500/20 hover:text-red-200" aria-label={`Annuler le rendez-vous de ${booking.customerName}${booking.paidCents ? ' et rembourser l’acompte' : ''}`}>{labels.confirmed} — {booking.paidCents ? 'annuler et rembourser' : 'annuler'}</button> : <span className="text-slate-400">{labels[booking.status]}</span>}</td>
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
