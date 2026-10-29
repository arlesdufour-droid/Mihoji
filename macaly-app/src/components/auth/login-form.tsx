'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const supabase = getSupabaseBrowserClient();

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !email.trim()) return;
    setPending(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/studio/demo/preview` } });
    setMessage(error ? 'Impossible d’envoyer le lien. Vérifiez votre adresse.' : 'Lien envoyé. Consultez votre boîte mail.');
    setPending(false);
  }

  async function signInWithGoogle() {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/studio/demo/preview` } });
    if (error) setMessage('La connexion Google est indisponible.');
  }

  return <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
    <Link href="/" className="text-sm font-bold text-indigo-300">Mihoji</Link>
    <h1 className="mt-8 text-3xl font-semibold">Bienvenue</h1>
    <p className="mt-2 text-sm text-slate-400">Connectez-vous pour retrouver vos espaces.</p>
    {supabase ? <form onSubmit={sendMagicLink} className="mt-8 space-y-3">
      <label className="block text-sm text-slate-300" htmlFor="email">Adresse email</label>
      <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-400" placeholder="vous@exemple.fr" />
      <button disabled={pending} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold transition hover:bg-indigo-500 disabled:opacity-60">{pending ? 'Envoi…' : 'Recevoir un lien magique'}</button>
      <button type="button" onClick={signInWithGoogle} className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold hover:bg-slate-800">Continuer avec Google</button>
    </form> : <Link href="/studio/demo/preview" className="mt-8 block rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold hover:bg-indigo-500">Entrer en mode démo</Link>}
    {message && <p className="mt-4 text-sm text-slate-400" role="status">{message}</p>}
  </section>;
}
