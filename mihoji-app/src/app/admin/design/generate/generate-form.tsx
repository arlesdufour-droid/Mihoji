'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { designExamples as examples, type DesignExample } from '@/lib/site/design-examples';

type Company = DesignExample['company'];

const styleOptions = [
  { id: '', label: 'Au choix du modèle' },
  { id: 'artisan', label: 'Artisan chaleureux' },
  { id: 'moderne', label: 'Moderne épuré' },
  { id: 'premium', label: 'Élégant premium' },
  { id: 'dynamique', label: 'Dynamique coloré' },
];

const input = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100';

function errorText(code: string) {
  if (code === 'ai_not_configured') return 'Aucune clé IA configurée (ANTHROPIC_API_KEY ou GROQ_API_KEY).';
  if (code === 'invalid_request') return 'Formulaire incomplet : décrivez le site (8 caractères minimum) et indiquez le nom de l’entreprise.';
  return 'La génération a échoué.';
}

export function GenerateForm() {
  const router = useRouter();
  const [request, setRequest] = useState('');
  const [trade, setTrade] = useState('');
  const [style, setStyle] = useState('');
  const [company, setCompany] = useState<Company>({ name: '', activity: '', address: '', phone: '', email: '' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const field = (key: keyof Company, label: string) => (
    <label className="grid gap-1 text-xs text-slate-400">{label}<input className={input} value={company[key]} onChange={(event) => setCompany({ ...company, [key]: event.target.value })} /></label>
  );

  const submit = async () => {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/admin/design/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'create', request, trade: trade || undefined, style: style || undefined, company }) });
      const data = await response.json().catch(() => ({})) as { id?: string; status?: string; error?: string };
      if (!response.ok || !data.id) {
        setError(errorText(data.error ?? ''));
        return;
      }
      if (data.status !== 'succeeded') setError(`La génération a échoué : ${data.error ?? 'raison inconnue'}`);
      router.push(`/admin/design/generate?id=${data.id}`);
      router.refresh();
    } catch {
      setError('La génération a échoué.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <div className="flex flex-wrap gap-2" aria-label="Exemples de demandes">
        {examples.map((example) => (
          <button key={example.label} type="button" onClick={() => { setRequest(example.request); setTrade(example.trade); setCompany(example.company); }} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-indigo-400 hover:text-white">{example.label}</button>
        ))}
      </div>
      <label className="grid gap-1 text-sm text-slate-300">Décrivez le site que vous voulez<textarea className={`${input} min-h-28`} value={request} onChange={(event) => setRequest(event.target.value)} required minLength={8} /></label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {field('name', 'Nom de l’entreprise')}
        {field('activity', 'Activité déclarée')}
        <label className="grid gap-1 text-xs text-slate-400">Métier<input className={input} value={trade} onChange={(event) => setTrade(event.target.value)} /></label>
        {field('address', 'Adresse')}
        {field('phone', 'Téléphone')}
        {field('email', 'Email')}
      </div>
      <label className="grid max-w-xs gap-1 text-xs text-slate-400">Style
        <select className={input} value={style} onChange={(event) => setStyle(event.target.value)}>{styleOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">{pending ? 'Génération en cours…' : 'Générer le site'}</button>
        {pending && <span className="text-xs text-slate-400">Une à deux minutes avec le modèle de design.</span>}
        {error && <span role="alert" className="text-sm text-rose-300">{error}</span>}
      </div>
    </form>
  );
}

export function RestyleForm({ generationId }: { generationId: string }) {
  const router = useRouter();
  const [request, setRequest] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/admin/design/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'restyle', request, generationId }) });
      const data = await response.json().catch(() => ({})) as { id?: string; status?: string; error?: string };
      if (!response.ok || !data.id || data.status !== 'succeeded') {
        setError(data.error ? `Changement refusé : ${data.error}` : errorText(''));
        return;
      }
      router.push(`/admin/design/generate?id=${data.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  };
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <input className={`${input} max-w-md`} placeholder="Ex. : un style plus élégant, en bleu marine" value={request} onChange={(event) => setRequest(event.target.value)} aria-label="Changement de style" required minLength={3} />
      <button type="submit" disabled={pending} className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50">{pending ? 'Changement…' : 'Changer le style'}</button>
      {error && <span role="alert" className="text-sm text-rose-300">{error}</span>}
    </form>
  );
}
