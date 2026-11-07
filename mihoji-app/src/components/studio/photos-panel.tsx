'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { photoKindLabels, photoKinds, type PhotoKind } from '@/lib/site/user-photos';

type Photo = { id: string; kind: PhotoKind; alt: string; url: string };

const errorMessages: Record<string, string> = {
  unsupported_type: 'Format non accepté : envoyez une image JPEG, PNG ou WebP.',
  too_large: 'Cette image dépasse 8 Mo : réduisez-la puis réessayez.',
  too_many: 'Vous avez atteint le maximum de 24 photos : supprimez-en une pour en ajouter.',
  unreadable: 'Cette image est illisible : essayez un autre fichier.',
  rate_limited: 'Trop d’envois en peu de temps. Réessayez dans quelques minutes.',
  database_required: 'L’envoi de photos n’est pas disponible en mode démonstration.',
};

// Onglet « Mes photos » du Studio : logo, photos de la boutique et réalisations, prioritaires sur les photos libres du site.
export function PhotosPanel({ projectId, onApplied }: { projectId: string; onApplied: () => void }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [kind, setKind] = useState<PhotoKind>('work');
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/user-photos');
    if (response.ok) setPhotos(await response.json() as Photo[]);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setMessage(null);
    let sent = 0;
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.set('file', file);
      form.set('kind', kind);
      form.set('alt', alt);
      const response = await fetch('/api/user-photos', { method: 'POST', body: form });
      if (response.ok) sent += 1;
      else {
        const body = await response.json().catch(() => ({})) as { error?: string };
        setMessage({ tone: 'error', text: errorMessages[body.error ?? ''] ?? 'L’envoi n’a pas abouti. Réessayez.' });
        break;
      }
    }
    if (input.current) input.current.value = '';
    setAlt('');
    await load();
    if (sent) setMessage({ tone: 'ok', text: sent === 1 ? 'Photo ajoutée. Cliquez sur « Utiliser mes photos dans le site » pour l’afficher.' : `${sent} photos ajoutées. Cliquez sur « Utiliser mes photos dans le site » pour les afficher.` });
    setBusy(false);
  };

  const remove = async (photo: Photo) => {
    setBusy(true);
    const response = await fetch(`/api/user-photos?id=${photo.id}`, { method: 'DELETE' });
    await load();
    setMessage(response.ok ? { tone: 'ok', text: 'Photo supprimée. Cliquez sur « Utiliser mes photos dans le site » pour mettre le site à jour.' } : { tone: 'error', text: 'La suppression n’a pas abouti.' });
    setBusy(false);
  };

  const apply = async () => {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/projects/${projectId}/apply-photos`, { method: 'POST' });
    if (response.ok) {
      setMessage({ tone: 'ok', text: 'Le site utilise maintenant vos photos. Une nouvelle version a été enregistrée dans l’historique.' });
      onApplied();
    } else {
      const body = await response.json().catch(() => ({})) as { error?: string };
      setMessage({ tone: 'error', text: body.error === 'structured_site_required' ? 'Ce site doit d’abord être recréé au nouveau format pour accueillir vos photos.' : 'Le site n’a pas pu être mis à jour. Réessayez.' });
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto h-full max-w-3xl overflow-auto p-6 text-slate-100">
      <h2 className="text-xl font-bold">Mes photos</h2>
      <p className="mt-2 text-sm text-slate-400">Envoyez votre logo, des photos de votre boutique ou de votre atelier et de vos réalisations. Elles sont utilisées en priorité à la place des photos libres de droits.</p>
      <div className="mt-6 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2">
        <label className="block text-sm"><span className="text-slate-300">Type de photo</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as PhotoKind)} disabled={busy} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
            {photoKinds.map((value) => <option key={value} value={value}>{photoKindLabels[value]}</option>)}
          </select>
        </label>
        <label className="block text-sm"><span className="text-slate-300">Description de la photo (facultatif)</span>
          <input value={alt} onChange={(event) => setAlt(event.target.value)} maxLength={160} disabled={busy} placeholder="Ex. Notre fournil à l’ouverture" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        </label>
        <div className="sm:col-span-2">
          <label htmlFor="photo-file" className="block text-sm text-slate-300">Choisir des images (JPEG, PNG ou WebP, 8 Mo au plus)</label>
          <input id="photo-file" ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={(event) => void upload(event.target.files)} className="mt-2 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500" />
        </div>
      </div>
      {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-xl p-3 text-sm ${message.tone === 'error' ? 'bg-rose-500/10 text-rose-200' : 'bg-emerald-500/10 text-emerald-200'}`}>{message.text}</p>}
      {photos.length === 0 ? <p className="mt-8 text-sm text-slate-500">Aucune photo pour le moment.</p> : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3" aria-label="Vos photos">
          {photos.map((photo) => (
            <li key={photo.id} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.alt || photoKindLabels[photo.kind]} className="aspect-[4/3] w-full object-cover" />
              <div className="flex items-center justify-between gap-2 p-2.5 text-xs">
                <span className="truncate text-slate-300">{photoKindLabels[photo.kind]}</span>
                <button type="button" onClick={() => void remove(photo)} disabled={busy} className="rounded-md px-2 py-1 font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50" aria-label={`Supprimer la photo : ${photo.alt || photoKindLabels[photo.kind]}`}>Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => void apply()} disabled={busy || photos.length === 0} className="mt-8 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50">Utiliser mes photos dans le site</button>
    </div>
  );
}
