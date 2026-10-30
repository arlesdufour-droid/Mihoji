'use client';

import { useState } from 'react';

export function AccountActions() {
  const [status, setStatus] = useState('');
  const deleteAccount = async () => {
    if (!window.confirm('Cette action est irréversible. Supprimer définitivement votre compte et votre espace ?')) return;
    const response = await fetch('/api/settings/delete-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: 'SUPPRIMER' }) });
    setStatus(response.ok ? 'Compte supprimé.' : 'La suppression a échoué.');
  };
  return <div className="space-y-3"><a href="/api/settings/export" className="inline-flex rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-indigo-500">Exporter mes données (JSON)</a><button type="button" onClick={() => void deleteAccount()} className="ml-3 rounded-lg border border-rose-500/50 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/10">Supprimer mon compte</button>{status && <p className="text-xs text-slate-400" role="status">{status}</p>}</div>;
}
