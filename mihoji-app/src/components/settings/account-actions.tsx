'use client';

import { useState } from 'react';

export function AccountActions() {
  const [status, setStatus] = useState('');
  const [exporting, setExporting] = useState(false);
  const exportData = async () => {
    setExporting(true);
    setStatus('');
    try {
      const response = await fetch('/api/settings/export', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error === 'database_required' ? 'L’export est disponible uniquement avec un compte connecté.' : `L’export a échoué (erreur ${response.status}).`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mihoji-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus('Export téléchargé.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'L’export a échoué. Réessayez.');
    } finally {
      setExporting(false);
    }
  };
  const deleteAccount = async () => {
    if (!window.confirm('Cette action est irréversible. Supprimer définitivement votre compte et votre espace ?')) return;
    const response = await fetch('/api/settings/delete-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: 'SUPPRIMER' }) });
    setStatus(response.ok ? 'Compte supprimé.' : 'La suppression a échoué.');
  };
  return <div className="space-y-3"><button type="button" onClick={() => void exportData()} disabled={exporting} className="inline-flex rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-indigo-500 disabled:cursor-wait disabled:opacity-60">{exporting ? 'Export en cours…' : 'Exporter mes données (JSON)'}</button><button type="button" onClick={() => void deleteAccount()} className="ml-3 rounded-lg border border-rose-500/50 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/10">Supprimer mon compte</button>{status && <p className="text-xs text-slate-400" role="status">{status}</p>}</div>;
}
