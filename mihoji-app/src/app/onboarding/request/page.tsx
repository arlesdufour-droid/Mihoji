'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { REQUEST_MAX, REQUEST_MIN, requestExamples } from '@/lib/site/onboarding-request';
import type { StyleId } from '@/lib/site/schema';
import { styles } from '@/lib/site/themes';

type UploadedPhoto = { id: string; url: string; kind: 'logo' | 'shop' | 'work' };
const photoChoices = [{ kind: 'logo', label: 'Mon logo' }, { kind: 'shop', label: 'Ma boutique ou mon atelier' }, { kind: 'work', label: 'Mes réalisations' }] as const;

const errorMessages: Record<string, string> = {
  insufficient_credits: 'Vous n’avez plus assez de crédits pour créer un site.',
  rate_limited: 'Trop de créations en peu de temps. Réessayez dans quelques minutes.',
  ai_not_configured: 'La création de site n’est pas disponible pour le moment.',
  company_required: 'Les informations de votre entreprise sont introuvables. Reprenez depuis le début.',
};

export default function RequestPage() {
  const router = useRouter();
  const [request, setRequest] = useState('');
  const [style, setStyle] = useState<StyleId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [distinction, setDistinction] = useState('');
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const files = useRef<Record<string, HTMLInputElement | null>>({});
  const uploadPhotos = async (kind: UploadedPhoto['kind'], list: FileList | null) => {
    if (!list?.length) return;
    setUploading(true);
    setPhotoError('');
    for (const file of Array.from(list)) {
      const form = new FormData();
      form.set('file', file);
      form.set('kind', kind);
      const response = await fetch('/api/user-photos', { method: 'POST', body: form });
      if (!response.ok) { setPhotoError('Une photo n’a pas pu être envoyée (JPEG, PNG ou WebP, 8 Mo au plus).'); break; }
      const body = await response.json() as UploadedPhoto;
      setPhotos((current) => [...current, { id: body.id, url: body.url, kind }]);
    }
    const input = files.current[kind];
    if (input) input.value = '';
    setUploading(false);
  };
  const removePhoto = async (photo: UploadedPhoto) => {
    await fetch(`/api/user-photos?id=${photo.id}`, { method: 'DELETE' });
    setPhotos((current) => current.filter((entry) => entry.id !== photo.id));
  };
  useEffect(() => {
    // Sans fiche entreprise, on ne peut pas créer de site : retour à la première étape.
    void fetch('/api/onboarding/company').then((response) => response.ok ? response.json() : null).then((value) => { if (value === null) router.replace('/onboarding/siret'); });
  }, [router]);
  const valid = request.trim().length >= REQUEST_MIN;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      // Les réponses aux questions courtes sont enregistrées d'abord : elles servent à la rédaction du site.
      await fetch('/api/onboarding/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ specialties: specialties.trim() || undefined, distinction: distinction.trim() || undefined }) });
      const response = await fetch('/api/onboarding/site', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request: request.trim(), ...(style ? { style } : {}) }) });
      const body = await response.json().catch(() => ({})) as { id?: string; error?: string };
      if (!response.ok || !body.id) throw new Error(body.error ?? 'generation_failed');
      await fetch('/api/onboarding/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 'complete' }) });
      router.push(body.id === 'demo' ? '/studio/demo' : `/studio/${body.id}/preview`);
    } catch (caught) {
      setError(errorMessages[caught instanceof Error ? caught.message : ''] ?? 'La création du site n’a pas abouti. Aucun crédit n’a été débité : réessayez.');
      setBusy(false);
    }
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-slate-50">
      <section className="w-full max-w-3xl">
        <p className="text-sm font-semibold text-indigo-300">Étape 4 sur 4</p>
        <h1 className="mt-4 text-3xl font-bold">Décrivez le site que vous voulez</h1>
        <p className="mt-3 text-slate-400">Dites-nous en quelques mots l’ambiance, ce que vos clients doivent pouvoir faire et ce que vous voulez mettre en avant. Nous nous occupons du reste.</p>
        <form onSubmit={submit} className="mt-8 space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <label className="block text-sm font-medium" htmlFor="site-request">Votre demande</label>
          <textarea id="site-request" value={request} onChange={(event) => { setRequest(event.target.value); setError(''); }} rows={5} maxLength={REQUEST_MAX} disabled={busy} placeholder="Ex. Je veux un site chaleureux avec prise de commande en ligne" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base outline-none focus:border-indigo-400 disabled:opacity-60" />
          <div>
            <p className="text-sm text-slate-400">Un exemple pour vous aider :</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {requestExamples.map((example) => <button key={example} type="button" disabled={busy} onClick={() => { setRequest(example); setError(''); }} className="rounded-full border border-slate-700 px-3 py-1.5 text-left text-sm text-slate-200 hover:border-indigo-400 disabled:opacity-60">{example}</button>)}
            </div>
          </div>
          <fieldset disabled={busy || uploading} className="space-y-4 rounded-xl border border-slate-800 p-4">
            <legend className="px-1 text-sm font-medium">Pour un site qui vous ressemble <span className="font-normal text-slate-400">(facultatif, 3 questions courtes)</span></legend>
            <label className="block text-sm"><span className="text-slate-300">Vos spécialités</span>
              <input value={specialties} onChange={(event) => setSpecialties(event.target.value)} maxLength={400} placeholder="Ex. pain au levain, viennoiseries, gâteaux d’anniversaire" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
            </label>
            <label className="block text-sm"><span className="text-slate-300">Ce qui vous distingue</span>
              <input value={distinction} onChange={(event) => setDistinction(event.target.value)} maxLength={400} placeholder="Ex. farines locales, fabrication sur place depuis trois générations" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
            </label>
            <div className="text-sm">
              <p className="text-slate-300">Vos photos <span className="text-slate-500">(utilisées à la place des photos libres de droits)</span></p>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {photoChoices.map((choice) => (
                  <div key={choice.kind}>
                    <label htmlFor={`photo-${choice.kind}`} className="text-xs text-slate-400">{choice.label}</label>
                    <input id={`photo-${choice.kind}`} ref={(node) => { files.current[choice.kind] = node; }} type="file" accept="image/jpeg,image/png,image/webp" multiple={choice.kind !== 'logo'} onChange={(event) => void uploadPhotos(choice.kind, event.target.files)} className="mt-1 block w-full text-xs text-slate-300 file:mr-2 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" />
                  </div>
                ))}
              </div>
              {photoError && <p role="alert" className="mt-2 text-xs text-rose-300">{photoError}</p>}
              {photos.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Photos envoyées">
                  {photos.map((photo) => (
                    <li key={photo.id} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photoChoices.find((choice) => choice.kind === photo.kind)?.label ?? 'Photo'} className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-600" />
                      <button type="button" onClick={() => void removePhoto(photo)} aria-label="Retirer cette photo" className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-slate-800 text-xs leading-5 text-slate-200 ring-1 ring-slate-600 hover:bg-rose-600">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </fieldset>
          <fieldset disabled={busy}>
            <legend className="text-sm font-medium">Un style en tête ? <span className="font-normal text-slate-400">(facultatif)</span></legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <button type="button" aria-pressed={style === null} onClick={() => setStyle(null)} className={`flex min-h-28 flex-col justify-between rounded-xl border p-3 text-left text-sm ${style === null ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'}`}>
                <span className="font-semibold">Mihoji choisit</span>
                <span className="text-xs text-slate-400">Le style le plus adapté à votre métier.</span>
              </button>
              {styles.map((item) => {
                const palette = item.palettes[0];
                return (
                  <button key={item.id} type="button" aria-pressed={style === item.id} onClick={() => setStyle(item.id)} className={`flex min-h-28 flex-col justify-between rounded-xl border p-3 text-left text-sm ${style === item.id ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'}`}>
                    <span aria-hidden="true" className="flex h-10 overflow-hidden rounded-md ring-1 ring-slate-600">
                      <span className="flex-[3]" style={{ background: palette.bg }} />
                      <span className="flex-1" style={{ background: palette.primary }} />
                      <span className="flex-1" style={{ background: palette.accent }} />
                      <span className="flex-1" style={{ background: palette.inverse }} />
                    </span>
                    <span className="mt-2 font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          {busy && <p role="status" className="rounded-xl bg-indigo-500/10 p-3 text-sm text-indigo-200">Nous créons votre site : choix du style, rédaction des textes et sélection des photos. Cela prend environ une minute, ne fermez pas cette page.</p>}
          <button type="submit" disabled={!valid || busy || uploading} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60">{busy ? 'Création en cours…' : 'Créer mon site'}</button>
        </form>
      </section>
    </main>
  );
}
