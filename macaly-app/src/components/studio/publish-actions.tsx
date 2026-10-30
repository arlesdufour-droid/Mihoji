'use client';

import { Check, Copy, ExternalLink, Share2, Upload } from 'lucide-react';
import { useState } from 'react';

export function PublishActions() {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = 'https://mihoji.app/demo/marketing-dashboard';
  const copy = async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1600); };
  return <div className="relative flex shrink-0 items-center gap-2">
    <button type="button" onClick={() => setShareOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500"><Share2 className="h-3.5 w-3.5" />Partager</button>
    <button type="button" disabled title="Bientôt disponible : la conformité et la sécurité doivent être validées avant publication." className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-400"><Upload className="h-3.5 w-3.5" />Bientôt disponible</button>
    {shareOpen && <div className="absolute right-0 top-12 z-30 w-80 rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-xl shadow-slate-950/60"><p className="text-sm font-semibold text-slate-100">Partager votre site</p><p className="mt-1 text-xs text-slate-500">Toute personne disposant de ce lien peut voir l&apos;aperçu en ligne.</p><div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 p-2"><span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-400">{shareUrl}</span><button type="button" onClick={copy} title="Copier le lien de partage" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500">{copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}</button><a href={shareUrl} target="_blank" rel="noreferrer" title="Ouvrir le site partagé" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500"><ExternalLink className="h-4 w-4" /></a></div></div>}
  </div>;
}
