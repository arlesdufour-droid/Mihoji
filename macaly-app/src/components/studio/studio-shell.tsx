/* eslint-disable @next/next/no-html-link-for-pages */
'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChatPanel } from '@/components/studio/chat-panel';
import { EditDesignBar } from '@/components/studio/edit-design-bar';
import { PreviewToolbar } from '@/components/studio/preview-toolbar';
import { PublishActions } from '@/components/studio/publish-actions';
import { StudioTabs } from '@/components/studio/studio-tabs';
import { UserMenu } from '@/components/account/user-menu';
import type { ChatMessage } from '@/components/studio/composer';

const initialHtml = '<div class="min-h-full bg-white p-8 text-slate-900"><p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Mihoji generated app</p><h1 class="mt-4 text-4xl font-bold tracking-tight">Your next dashboard starts here.</h1><p class="mt-3 max-w-xl text-slate-500">A focused workspace for turning ideas into polished products.</p><div class="mt-10 grid gap-4 md:grid-cols-3"><div class="rounded-2xl bg-slate-100 p-5"><p class="text-2xl font-bold">24.8k</p><p class="mt-1 text-sm text-slate-500">Monthly visitors</p></div><div class="rounded-2xl bg-indigo-600 p-5 text-white"><p class="text-2xl font-bold">84%</p><p class="mt-1 text-sm text-indigo-100">Conversion rate</p></div><div class="rounded-2xl bg-slate-100 p-5"><p class="text-2xl font-bold">12m</p><p class="mt-1 text-sm text-slate-500">Time saved</p></div></div></div>';

export function StudioShell({ projectId, remaining }: { projectId: string; remaining: number }) {
  const pathname = usePathname();
  const activeTab = pathname.split('/').pop() || 'preview';
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: 'Tell me what you want to build. I will shape the first version and keep the preview in sync.' }]);
  const [html, setHtml] = useState(initialHtml);
  const [streaming, setStreaming] = useState(false);
  const [reload, setReload] = useState(0);
  const content = activeTab === 'code' ? <div className="h-full overflow-auto bg-slate-950 p-5 font-mono text-xs leading-6 text-indigo-100"><pre className="whitespace-pre-wrap">{html}</pre></div> : activeTab === 'preview' ? <div className="relative h-full overflow-hidden"><PreviewToolbar onReload={() => setReload((value) => value + 1)} /><div className="flex h-[calc(100%-49px)] items-center justify-center overflow-auto bg-slate-950 p-4 md:p-8"><iframe key={reload} title="Generated app preview" srcDoc={`<!doctype html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body>${html}</body></html>`} className="h-full w-full rounded-xl border border-slate-800 bg-white" sandbox="allow-scripts" /><EditDesignBar /></div></div> : <div className="flex h-full items-center justify-center p-8 text-center"><div><p className="text-sm font-semibold text-slate-200">{activeTab[0].toUpperCase() + activeTab.slice(1)} workspace</p><p className="mt-2 text-xs text-slate-500">This workspace is ready for your project data and controls.</p></div></div>;
  const handleMessages = (next: ChatMessage[]) => { setMessages(next); const latest = next[next.length - 1]; if (latest?.role === 'assistant' && latest.content.includes('<div')) setHtml(latest.content); };
  return <div className="flex h-dvh flex-col overflow-hidden bg-slate-950 text-slate-50"><header className="flex shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-950 px-3 py-2.5 md:px-5"><a href="/" className="flex items-center gap-2 text-sm font-bold"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs">m</span><span className="hidden sm:inline">Mihoji</span></a><div className="hidden h-5 w-px bg-slate-800 md:block" /><div className="min-w-0 flex-1"><StudioTabs projectId={projectId} /></div><PublishActions /><UserMenu /></header><div className="flex min-h-0 flex-1 flex-col md:flex-row"><ChatPanel remaining={remaining} messages={messages} onMessages={handleMessages} streaming={streaming} onStreamingChange={setStreaming} onStop={() => setStreaming(false)} /><main className="min-h-0 min-w-0 flex-1 bg-slate-950">{content}</main></div></div>;
}
