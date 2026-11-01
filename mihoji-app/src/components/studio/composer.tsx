'use client';

import { Mic, Paperclip, Send, Sparkles, Square } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCounter } from '@/components/studio/credit-counter';
import { estimateCredits } from '@/lib/ai/estimate';
import { dropFailedExchanges, GENERATION_FAILED_MESSAGE, INSUFFICIENT_CREDITS_MESSAGE, MESSAGE_TOO_LONG_MESSAGE, RATE_LIMITED_MESSAGE, SERVICE_UNAVAILABLE_MESSAGE } from '@/lib/ai/failure';
import { filesSummaryForUser, sanitizeSimpleText } from '@/lib/ai/sanitize';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

type Props = {
  projectId: string;
  remaining: number;
  messages: ChatMessage[];
  onMessages: (messages: ChatMessage[], options?: { persist?: boolean }) => void;
  streaming: boolean;
  onStreamingChange: (streaming: boolean) => void;
  onStop: () => void;
  uiMode: 'simple' | 'expert';
};

// L'historique complet fait échouer la validation de /api/generate (30 messages max, 8 000 caractères)
// et consomme des tokens inutiles : on n'envoie que les 10 derniers messages, tronqués.
const CONTEXT_MESSAGES = 10;
const CONTEXT_MESSAGE_LENGTH = 1_000;

function contextFor(messages: ChatMessage[]): ChatMessage[] {
  return dropFailedExchanges(messages).slice(-CONTEXT_MESSAGES).map((message) => ({ ...message, content: message.content.slice(0, CONTEXT_MESSAGE_LENGTH) }));
}

export function Composer({ projectId, remaining, messages, onMessages, streaming, onStreamingChange, onStop, uiMode }: Props) {
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<'plan' | 'build'>('build');
  const controller = useRef<AbortController | null>(null);
  const router = useRouter();

  const stop = () => {
    controller.current?.abort();
    controller.current = null;
    onStreamingChange(false);
    onStop();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim() || streaming || remaining === 0) return;
    const content = value.trim();
    const next = [...messages, { role: 'user' as const, content }, { role: 'assistant' as const, content: '' }];
    onMessages(next);
    setValue('');
    onStreamingChange(true);
    controller.current = new AbortController();
    try {
      const response = await fetch('/api/generate', { method: 'POST', signal: controller.current.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, task: mode === 'plan' ? 'plan' : 'chat', messages: [...contextFor(messages), { role: 'user', content }] }) });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        onMessages([...next.slice(0, -1), { role: 'assistant', content: data.error === 'insufficient_credits' ? INSUFFICIENT_CREDITS_MESSAGE : data.error === 'ai_rate_limited' ? RATE_LIMITED_MESSAGE : data.error === 'invalid_request' ? MESSAGE_TOO_LONG_MESSAGE : SERVICE_UNAVAILABLE_MESSAGE }]);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistant = '';
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        assistant += decoder.decode(chunk.value, { stream: true });
        // Les morceaux intermédiaires ne sont pas persistés : seule la réponse finale est enregistrée.
        onMessages([...next.slice(0, -1), { role: 'assistant', content: assistant }], { persist: false });
      }
      const changed = response.headers.get('x-mihoji-changed') === '1';
      const files = (response.headers.get('x-mihoji-files') ?? '').split(',').filter(Boolean);
      const final = uiMode === 'simple'
        ? sanitizeSimpleText(assistant) ?? (changed ? filesSummaryForUser(files) : GENERATION_FAILED_MESSAGE)
        : assistant;
      onMessages([...next.slice(0, -1), { role: 'assistant', content: final }]);
      router.refresh();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      onMessages([...next.slice(0, -1), { role: 'assistant', content: SERVICE_UNAVAILABLE_MESSAGE }]);
    } finally {
      controller.current = null;
      onStreamingChange(false);
    }
  };

  const estimate = value.trim() ? estimateCredits(value, mode === 'plan' ? 'plan' : 'chat') : null;
  return <form onSubmit={submit} className="border-t border-slate-800 p-3"><div className="rounded-xl border border-slate-700 bg-slate-950/80 shadow-inner shadow-slate-950/40 focus-within:border-indigo-500/70"><textarea value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Décrivez votre site…" rows={3} disabled={streaming} className="w-full resize-none bg-transparent px-3 pt-3 text-sm text-slate-100 placeholder-slate-500 outline-none" />{estimate && <p className="px-3 text-xs text-slate-500">≈ {estimate.low}–{estimate.high} crédits</p>}<div className="flex items-center justify-between px-2 pb-2"><div className="flex items-center gap-1"><button type="button" onClick={() => setMode(mode === 'plan' ? 'build' : 'plan')} title="Choisir le mode IA" className="rounded-md px-2 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200">{mode === 'plan' ? 'Réfléchir' : 'Construire'} <Sparkles className="inline h-4 w-4" /></button><button type="button" title="Joindre un fichier" className="rounded-md p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-200"><Paperclip className="h-4 w-4" /></button></div><div className="flex items-center gap-1"><CreditCounter remaining={remaining} /><span className="mx-1 h-5 w-px bg-slate-700" /><button type="button" title="Utiliser le microphone" className="rounded-md p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-200"><Mic className="h-4 w-4" /></button>{streaming ? <button type="button" onClick={stop} title="Arrêter la génération" className="rounded-lg bg-rose-500/15 p-2 text-rose-300"><Square className="h-4 w-4" /></button> : <button type="submit" disabled={!value.trim() || remaining === 0} title="Envoyer la demande" className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /></button>}</div></div></div></form>;
}
