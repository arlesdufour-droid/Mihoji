import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { projects, publications } from '@/db/schema';
import { AgencyMode } from '@/components/marketing/agency-mode';
import { getSession } from '@/lib/auth';

export const instant = false;

export default async function AgencyPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect('/login');
  const sites = session.isDemo ? [] : await getDb().select({ id: projects.id, name: projects.name, createdAt: projects.createdAt }).from(projects).where(eq(projects.workspaceId, session.workspaceId)).orderBy(desc(projects.createdAt));
  const published = new Set(session.isDemo || sites.length === 0 ? [] : (await getDb().select({ projectId: publications.projectId }).from(publications).where(and(inArray(publications.projectId, sites.map((site) => site.id)), eq(publications.status, 'published')))).map((row) => row.projectId));
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-50">
      <AgencyMode />
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold text-indigo-300">Espace agence</p>
        <h1 className="mt-2 text-3xl font-bold">Mes clients</h1>
        <p className="mt-2 text-slate-400">{session.workspaceName} · {sites.length} site{sites.length > 1 ? 's' : ''} client{sites.length > 1 ? 's' : ''}</p>
        <div className="mt-6">
          <Link href="/onboarding/siret" className="inline-block rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold hover:bg-indigo-500">Créer le site d’un client</Link>
        </div>
        {sites.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Aucun client pour l’instant. Créez le site d’un premier client à partir de son numéro SIRET.</p>
        ) : (
          <ul className="mt-8 divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900">
            {sites.map((site) => (
              <li key={site.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <span><span className="block font-medium">{site.name}</span><span className="text-xs text-slate-500">{published.has(site.id) ? 'En ligne' : 'Pas encore en ligne'}</span></span>
                <Link href={`/studio/${site.id}/preview`} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">Ouvrir dans le Studio</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
