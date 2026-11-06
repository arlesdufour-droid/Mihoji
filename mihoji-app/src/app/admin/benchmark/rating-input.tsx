'use client';

import { useState } from 'react';

// Note manuelle de 1 à 5 d'un site du banc d'essai, enregistrée avec l'exécution ; un second clic sur la même note l'efface.
export function RatingInput({ runId, siteId, initial }: { runId: string; siteId: string; initial: number | null }) {
  const [rating, setRating] = useState<number | null>(initial);
  const [error, setError] = useState('');
  const save = async (value: number) => {
    const next = value === rating ? null : value;
    setError('');
    const response = await fetch('/api/admin/benchmark/rating', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId, siteId, rating: next }) });
    if (!response.ok) { setError('Enregistrement impossible.'); return; }
    setRating(next);
  };
  return (
    <div role="group" aria-label={`Ma note pour ${siteId}`} className="flex items-center gap-1" data-testid={`manual-${siteId}`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <button key={value} type="button" onClick={() => void save(value)} aria-pressed={rating === value} aria-label={`Note ${value} sur 5`} className={`h-8 w-8 rounded-md border text-sm font-semibold ${rating === value ? 'border-indigo-400 bg-indigo-600 text-white' : 'border-slate-600 text-slate-300 hover:bg-slate-800'}`}>{value}</button>
      ))}
      <span className="ml-2 text-xs text-slate-400" role="status">{error || (rating ? `Votre note : ${rating}/5` : 'Pas encore notée')}</span>
    </div>
  );
}
