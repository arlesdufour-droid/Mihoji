'use client';

import { Mic, Paperclip, Send, Sparkles, Square } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCounter } from '@/components/studio/credit-counter';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

type Props = {
  remaining: number;
  messages: ChatMessage[];
  onMessages: (messages: ChatMessage[]) => void;
  streaming: boolean;
  onStreamingChange: (streaming: boolean) => void;
  onStop: () => void;
};

export function Composer({ remaining, messages, onMessages, streaming, onStreamingChange, onStop }: Props) {
  const [value, setValue] = useState('');
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
      const response = await fetch('/api/generate', { method: 'POST', signal: controller.current.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: 'demo', messages: [...messages, { role: 'user', content }] }) });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        onMessages([...next.slice(0, -1), { role: 'assistant', content: data.error === 'insufficient_credits' ? 'Not enough credits. Add credits or upgrade your plan.' : 'The AI service is temporarily unavailable.' }]);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistant = '';
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        assistant += decoder.decode(chunk.value, { stream: true });
        onMessages([...next.slice(0, -1), { role: 'assistant', content: assistant }]);
      }
      router.refresh();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      onMessages([...next.slice(0, -1), { role: 'assistant', content: 'The AI service is temporarily unavailable.' }]);
    } finally {
      controller.current = null;
      onStreamingChange(false);
    }
  };

  return <form onSubmit={submit} className="border-t border-slate-800 p-3"><div className="rounded-xl border border-slate-700 bg-slate-950/80 shadow-inner shadow-slate-950/40 focus-within:border-indigo-500/70"><textarea value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Describe your website…" rows={3} disabled={streaming} className="w-full resize-none bg-transparent px-3 pt-3 text-sm text-slate-100 placeholder-slate-500 outline-none" /><div className="flex items-center justify-between px-2 pb-2"><div className="flex items-center gap-1"><button type="button" title="Attach a file" className="rounded-md p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-200"><Paperclip className="h-4 w-4" /></button><button type="button" title="Choose AI mode" className="rounded-md p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-200"><Sparkles className="h-4 w-4" /></button></div><div className="flex items-center gap-1"><CreditCounter remaining={remaining} /><span className="mx-1 h-5 w-px bg-slate-700" /><button type="button" title="Use microphone" className="rounded-md p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-200"><Mic className="h-4 w-4" /></button>{streaming ? <button type="button" onClick={stop} title="Stop generation" className="rounded-lg bg-rose-500/15 p-2 text-rose-300"><Square className="h-4 w-4" /></button> : <button type="submit" disabled={!value.trim() || remaining === 0} title="Send prompt" className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /></button>}</div></div></div></form>;
}
