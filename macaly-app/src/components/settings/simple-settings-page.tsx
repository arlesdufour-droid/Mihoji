import { Check, Pencil, ShieldAlert, ToggleLeft } from 'lucide-react';

type SettingsKind = 'preferences' | 'general' | 'members' | 'connections' | 'integrations' | 'mcp' | 'domains';

type Props = { title: string; description: string; kind: SettingsKind };

const groups: Record<string, string[]> = {
  connections: ['Agents', 'Messaging'],
  integrations: ['Built-in', 'Analytics & tracking', 'Marketing & ads'],
  mcp: ['Developer', 'Productivity', 'Research'],
};

export function SimpleSettingsPage({ title, description, kind }: Props) {
  const kindGroups = groups[kind];
  return <div>
    <div className="mb-8"><p className="text-sm font-medium text-indigo-400">Workspace settings</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1><p className="mt-2 text-sm text-slate-400">{description}</p></div>
    {kindGroups ? <div className="space-y-8">{kindGroups.map((group) => <section key={group}><h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">{group}</h2><div className="grid gap-4 md:grid-cols-2">{['Slack', 'Notion'].map((name) => <div key={name} className="rounded-xl bg-slate-900 p-5 ring-1 ring-slate-800"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold">{name}</h3><p className="mt-2 text-xs leading-5 text-slate-500">Connect this service to your Mihoji workspace.</p></div><button type="button" className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-indigo-500 hover:text-white">+ Connect</button></div></div>)}</div></section>)}</div> : <div className="space-y-4">
      <div className="rounded-xl bg-slate-900 p-6 ring-1 ring-slate-800"><div className="flex items-center justify-between gap-4"><div><h2 className="text-sm font-semibold">{kind === 'general' ? 'Workspace name' : kind === 'members' ? 'Invite teammates' : 'Appearance'}</h2><p className="mt-2 text-xs text-slate-500">{kind === 'general' ? 'Mihoji workspace' : kind === 'members' ? 'Invite people by email or share a link.' : 'Choose the way Mihoji looks for you.'}</p></div><Pencil className="h-4 w-4 text-slate-500" /></div>
        {kind === 'preferences' && <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" className="rounded-xl border-2 border-slate-700 bg-slate-800 p-5 text-left text-sm">Dark <Check className="mt-3 h-4 w-4 text-indigo-400" /></button><button type="button" className="rounded-xl border border-slate-700 p-5 text-left text-sm text-slate-400">Light</button></div>}
        {kind === 'members' && <div className="mt-5 flex gap-2"><input type="email" placeholder="teammate@example.com" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none" /><button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold">Send invite</button></div>}
      </div>
      <div className="rounded-xl bg-slate-900 p-6 ring-1 ring-slate-800"><div className="flex items-center gap-3"><ToggleLeft className="h-5 w-5 text-indigo-300" /><div><h2 className="text-sm font-semibold">{kind === 'preferences' ? 'Browser notifications' : 'Workspace access'}</h2><p className="mt-1 text-xs text-slate-500">Configure this setting for the current workspace.</p></div></div></div>
      {kind === 'general' && <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6"><div className="flex items-center gap-3"><ShieldAlert className="h-5 w-5 text-rose-300" /><div><h2 className="text-sm font-semibold text-rose-200">Danger zone</h2><p className="mt-1 text-xs text-slate-500">Deleting a workspace cannot be undone.</p></div><button type="button" className="ml-auto rounded-lg border border-rose-500/40 px-3 py-2 text-xs text-rose-300">Delete workspace</button></div></div>}
    </div>}
  </div>;
}
