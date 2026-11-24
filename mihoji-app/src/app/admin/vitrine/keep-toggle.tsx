'use client';

import { useState } from 'react';

// Case « garder » d'un site d'exemple : enregistrée tout de suite dans le dépôt (src/content/vitrine/keep.json).
export function KeepToggle({ slug, label, initial }: { slug: string; label: string; initial: boolean }) {
  const [keep, setKeep] = useState(initial);
  const [error, setError] = useState('');
  const change = async (value: boolean) => {
    setKeep(value);
    setError('');
    const response = await fetch('/api/admin/vitrine/keep', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, keep: value }) });
    if (!response.ok) { setKeep(!value); setError('Le choix n’a pas pu être enregistré.'); }
  };
  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-600 px-3 py-1.5 text-sm">
        <input type="checkbox" checked={keep} onChange={(event) => void change(event.target.checked)} aria-label={`Garder : ${label}`} className="size-4" />
        Garder
      </label>
      {error && <p role="alert" className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}
