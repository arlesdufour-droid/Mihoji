'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const inputClass = 'mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-400';

// Saisie manuelle (pas encore de SIRET) : la fiche entreprise est créée sans numéros, à compléter plus tard dans les réglages.
export default function ManualCompanyPage() {
  const router = useRouter();
  const [fields, setFields] = useState({ name: '', activity: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const company = { siret: null, siren: null, name: fields.name.trim(), legalForm: 'Forme juridique non renseignée', address: fields.address.trim(), activity: fields.activity.trim(), createdAt: new Date().toISOString().slice(0, 10), vatNumber: '', status: 'active' };
      const saved = await fetch('/api/onboarding/company', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(company) });
      if (!saved.ok) throw new Error('company_save_failed');
      await fetch('/api/onboarding/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 'missing-fields' }) });
      router.push('/onboarding/missing-fields');
    } catch {
      setError('Enregistrement impossible. Vérifiez les champs et réessayez.');
      setSaving(false);
    }
  };
  const fieldList = [['name', 'Nom de votre entreprise', 'Ex. Atelier Dupont'], ['activity', 'Votre métier ou activité', 'Ex. Plomberie et chauffage'], ['address', 'Adresse (avec code postal et ville)', 'Ex. 12 rue des Lilas, 17000 La Rochelle']] as const;
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-slate-50"><section className="w-full max-w-xl"><p className="text-sm font-semibold text-indigo-300">Étape 1 sur 4</p><h1 className="mt-4 text-3xl font-bold">Saisissez les informations de votre entreprise</h1><p className="mt-3 text-slate-400">Vous pourrez compléter ces informations dans votre Studio.</p><form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">{fieldList.map(([key, label, placeholder]) => <label key={key} className="block text-sm"><span className="text-slate-300">{label}</span><input required value={fields[key]} placeholder={placeholder} onChange={(event) => setFields({ ...fields, [key]: event.target.value })} className={inputClass} /></label>)}{error && <p role="alert" className="text-sm text-rose-300">{error}</p>}<button type="submit" disabled={saving} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60">Continuer</button></form></section></main>;
}
