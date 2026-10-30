/* eslint-disable @next/next/no-html-link-for-pages */
'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChatPanel } from '@/components/studio/chat-panel';
import { EditDesignBar } from '@/components/studio/edit-design-bar';
import { PreviewToolbar } from '@/components/studio/preview-toolbar';
import { PublishActions } from '@/components/studio/publish-actions';
import { StudioTabs } from '@/components/studio/studio-tabs';
import { UserMenu } from '@/components/account/user-menu';
import type { ChatMessage } from '@/components/studio/composer';
import type { DemoProject } from '@/lib/templates/site';

const initialHtml = '<div class="min-h-full bg-white p-8 text-slate-900"><p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Site Mihoji</p><h1 class="mt-4 text-4xl font-bold tracking-tight">Votre prochain site commence ici.</h1><p class="mt-3 max-w-xl text-slate-500">Un espace simple pour transformer vos idées en un site professionnel.</p><div class="mt-10 grid gap-4 md:grid-cols-3"><div class="rounded-2xl bg-slate-100 p-5"><p class="text-2xl font-bold">24,8 k</p><p class="mt-1 text-sm text-slate-500">Visiteurs ce mois-ci</p></div><div class="rounded-2xl bg-indigo-600 p-5 text-white"><p class="text-2xl font-bold">84 %</p><p class="mt-1 text-sm text-indigo-100">Taux de conversion</p></div><div class="rounded-2xl bg-slate-100 p-5"><p class="text-2xl font-bold">12 min</p><p class="mt-1 text-sm text-slate-500">Temps gagné</p></div></div></div>';

export function StudioShell({ projectId, remaining, isDemo }: { projectId: string; remaining: number; isDemo: boolean }) {
  const pathname = usePathname();
  const activeTab = pathname.split('/').pop() || 'preview';
  const [project, setProject] = useState<DemoProject | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => project ? [{ role: 'assistant', content: `J’ai créé le site de ${project.name} à partir du modèle ${project.family}. Dites-moi ce que vous voulez modifier.` }] : [{ role: 'assistant', content: 'Décrivez votre site et je vous aiderai à le faire évoluer.' }]);
  const [html, setHtml] = useState(project?.html ?? initialHtml);
  const [streaming, setStreaming] = useState(false);
  const [reload, setReload] = useState(0);
  const [mode, setMode] = useState<'simple' | 'expert'>(() => {
    if (typeof window === 'undefined') return 'simple';
    const stored = window.localStorage.getItem('mihoji-ui-mode');
    return stored === 'expert' ? 'expert' : 'simple';
  });
  useEffect(() => {
    void fetch(`/api/projects/${projectId}`).then((response) => response.ok ? response.json() : null).then((value) => {
      if (value) {
        setProject(value as DemoProject);
        setHtml(value.html || initialHtml);
        setMessages([{ role: 'assistant', content: `J’ai créé le site de ${value.name}. Dites-moi ce que vous voulez modifier.` }]);
      }
    });
  }, [projectId]);
  useEffect(() => {
    const update = (event: Event) => setMode((event as CustomEvent<'simple' | 'expert'>).detail);
    window.addEventListener('mihoji-ui-mode-change', update);
    return () => window.removeEventListener('mihoji-ui-mode-change', update);
  }, []);
  const content = activeTab === 'code' ? <div className="h-full overflow-auto bg-slate-950 p-5 font-mono text-xs leading-6 text-indigo-100"><pre className="whitespace-pre-wrap">{html}</pre></div> : activeTab === 'preview' ? <div className="relative h-full overflow-hidden"><PreviewToolbar onReload={() => setReload((value) => value + 1)} /><div className="flex h-[calc(100%-49px)] items-center justify-center overflow-auto bg-slate-950 p-4 md:p-8"><iframe key={reload} title="Aperçu du site généré" srcDoc={`<!doctype html><html lang="fr"><head><script src="https://cdn.tailwindcss.com"></script></head><body>${html}</body></html>`} className="h-full w-full rounded-xl border border-slate-800 bg-white" sandbox="allow-scripts" /><EditDesignBar /></div></div> : <div className="flex h-full items-center justify-center p-8 text-center"><div><p className="text-sm font-semibold text-slate-200">Espace {activeTab}</p><p className="mt-2 text-xs text-slate-500">Cet espace est prêt pour les données et les réglages de votre projet.</p></div></div>;
  const handleMessages = (next: ChatMessage[]) => { setMessages(next); const latest = next[next.length - 1]; if (latest?.role === 'assistant' && latest.content.includes('<div')) setHtml(latest.content); };
  return <div className="flex h-dvh flex-col overflow-hidden bg-slate-950 text-slate-50"><header className="flex shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-950 px-3 py-2.5 md:px-5"><a href="/" className="flex items-center gap-2 text-sm font-bold"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs">m</span><span className="hidden sm:inline">{project?.name ?? 'Mihoji'}</span></a><div className="hidden h-5 w-px bg-slate-800 md:block" /><div className="min-w-0 flex-1"><StudioTabs projectId={projectId} mode={mode} /></div><PublishActions /><UserMenu mode={mode} isDemo={isDemo} /></header><div className="flex min-h-0 flex-1 flex-col md:flex-row"><ChatPanel projectId={projectId} remaining={remaining} messages={messages} onMessages={handleMessages} streaming={streaming} onStreamingChange={setStreaming} onStop={() => setStreaming(false)} /><main className="min-h-0 min-w-0 flex-1 bg-slate-950">{content}</main></div></div>;
}
