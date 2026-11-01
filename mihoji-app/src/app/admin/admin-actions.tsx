'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AddCreditsForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState('10000');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) {
      setError('Montant invalide.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_credits', workspaceId, amount: value }) });
      if (!response.ok) {
        setError('Ajout impossible.');
        return;
      }
      router.refresh();
    } catch {
      setError('Ajout impossible.');
    } finally {
      setPending(false);
    }
  };

  return (
    <span className="flex items-center gap-1">
      <input type="number" min={1} value={amount} onChange={(event) => setAmount(event.target.value)} className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100" aria-label="Montant de crédits" />
      <button type="button" onClick={submit} disabled={pending} className="rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-500 disabled:opacity-40">Ajouter</button>
      {error && <span className="text-xs text-rose-300">{error}</span>}
    </span>
  );
}

export function SuspendButton({ publicationId, status }: { publicationId: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  if (status === 'suspended') return <span className="text-xs text-slate-500">Suspendu</span>;

  const suspend = async () => {
    setPending(true);
    try {
      await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'suspend_publication', publicationId }) });
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return <button type="button" onClick={suspend} disabled={pending} className="rounded bg-rose-500/15 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/25 disabled:opacity-40">Suspendre</button>;
}
