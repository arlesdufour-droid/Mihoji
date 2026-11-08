'use client';

import { useCallback, useEffect, useState } from 'react';
import { capabilityLabels, type Capability } from '@/lib/connectors/registry';

type Connector = { id: string; label: string; description: string; auth: string; status: 'available' | 'soon'; rights: string; credentialLabel: string | null; capabilities: Capability[]; connected: boolean; accountLabel: string | null };

const errors: Record<string, string> = {
  invalid_credentials: 'Cette clé n’est pas reconnue par le service. Vérifiez-la et réessayez.',
  unavailable: 'Le service ne répond pas pour le moment. Réessayez dans quelques minutes.',
  database_required: 'Cette fonction n’est pas disponible en mode démonstration.',
  rate_limited: 'Trop d’essais : réessayez dans une heure.',
  invalid_request: 'Saisissez la clé complète.',
};

// Onglet « Connexions » du Studio : le commerçant branche ses outils ; l'IA du Studio s'appuie sur leurs capacités.
export function ConnectionsPanel() {
  const [items, setItems] = useState<Connector[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ id: string; tone: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/connections');
    if (response.ok) setItems(await response.json() as Connector[]);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  // Retour de la configuration Stripe : message selon le résultat.
  useEffect(() => {
    const state = new URLSearchParams(window.location.search).get('stripe');
    if (!state) return;
    const texts: Record<string, { tone: 'ok' | 'error'; text: string }> = {
      connected: { tone: 'ok', text: 'Stripe est connecté : les paiements arrivent directement sur votre compte.' },
      incomplete: { tone: 'error', text: 'La configuration de votre compte Stripe n’est pas terminée. Cliquez de nouveau sur « Connecter Stripe » pour la reprendre.' },
      missing: { tone: 'error', text: 'Aucune configuration Stripe en cours : cliquez sur « Connecter Stripe ».' },
      error: { tone: 'error', text: 'Stripe ne répond pas pour le moment. Réessayez dans quelques minutes.' },
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (texts[state]) setMessage({ id: 'stripe', ...texts[state] });
  }, []);

  const startStripe = async () => {
    setBusy(true);
    setMessage(null);
    const response = await fetch('/api/connections/stripe/start', { method: 'POST' });
    const body = await response.json().catch(() => ({})) as { url?: string; error?: string };
    if (response.ok && body.url) { window.location.href = body.url; return; }
    setBusy(false);
    setMessage({ id: 'stripe', tone: 'error', text: errors[body.error ?? ''] ?? 'La connexion a échoué.' });
  };

  const connect = async (item: Connector) => {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/connections/${item.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret }) });
    const body = await response.json().catch(() => ({})) as { error?: string };
    setBusy(false);
    if (response.ok) { setSecret(''); setOpen(null); setMessage({ id: item.id, tone: 'ok', text: `${item.label} est connecté.` }); await load(); }
    else setMessage({ id: item.id, tone: 'error', text: errors[body.error ?? ''] ?? 'La connexion a échoué.' });
  };

  const disconnect = async (item: Connector) => {
    setBusy(true);
    const response = await fetch(`/api/connections/${item.id}`, { method: 'DELETE' });
    setBusy(false);
    setMessage(response.ok ? { id: item.id, tone: 'ok', text: `${item.label} est déconnecté : votre clé a été supprimée.` } : { id: item.id, tone: 'error', text: 'La déconnexion a échoué.' });
    await load();
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-xl font-bold">Connexions</h2>
        <p className="mt-2 text-sm text-slate-400">Branchez vos outils : l’assistant du Studio s’appuie sur eux pour ajouter des fonctions à votre site (paiement, agenda, emails…). Vos clés sont chiffrées et vous pouvez vous déconnecter à tout moment.</p>
        {!items ? <p className="mt-8 text-sm text-slate-500">Chargement…</p> : (
          <ul className="mt-6 space-y-4" aria-label="Outils connectables">
            {items.map((item) => (
              <li key={item.id} data-connector={item.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{item.label} {item.connected && <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">Connecté</span>}</h3>
                    <p className="mt-1 text-sm text-slate-400">{item.description}</p>
                    {item.connected && item.accountLabel && <p className="mt-1 text-xs text-slate-500">Compte : {item.accountLabel}</p>}
                  </div>
                  {item.status === 'soon' ? <button type="button" disabled className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-500">Bientôt disponible</button>
                    : item.connected ? <button type="button" disabled={busy} onClick={() => void disconnect(item)} className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800">Déconnecter {item.label}</button>
                    : item.auth === 'stripe_connect' ? <button type="button" disabled={busy} onClick={() => void startStripe()} className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-400">Connecter {item.label}</button>
                    : <button type="button" onClick={() => { setOpen(open === item.id ? null : item.id); setMessage(null); }} className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-400">Connecter {item.label}</button>}
                </div>
                <p className="mt-3 text-xs text-slate-500">Ce que l’assistant pourra faire : {item.capabilities.map((capability) => capabilityLabels[capability]).join(', ')}.</p>
                <p className="mt-1 text-xs text-slate-500">Droits demandés : {item.rights}</p>
                {open === item.id && !item.connected && item.credentialLabel && (
                  <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); void connect(item); }}>
                    <label className="min-w-64 flex-1 text-sm">{item.credentialLabel}
                      <input type="password" autoComplete="off" value={secret} onChange={(event) => setSecret(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                    </label>
                    <button type="submit" disabled={busy || secret.trim().length < 8} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Enregistrer la connexion</button>
                  </form>
                )}
                {message?.id === item.id && <p role="status" className={`mt-3 text-sm ${message.tone === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>{message.text}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
