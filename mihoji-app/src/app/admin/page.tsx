import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { desc, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { abuseReports, creditLedger, publications, subscriptions, supportRequests, users, workspaces } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { AddCreditsForm, SuspendButton } from './admin-actions';

export const instant = false;

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' });

function formatDate(value: string | Date) {
  return dateFormat.format(new Date(value));
}

// shadowCost est stocké en tokens (1 crédit = 1 token). Estimation ≈ 0,30 € / 1 M tokens (tarif Groq gpt-oss moyen).
function formatAiCost(tokens: number) {
  const eur = (tokens * 0.3) / 1_000_000;
  return `${tokens.toLocaleString('fr-FR')} tokens ≈ ${eur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 4 })}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-8"><h2 className="text-lg font-semibold text-slate-200">{title}</h2><div className="mt-3 overflow-x-auto rounded-xl border border-slate-800">{children}</div></section>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 text-sm text-slate-300">{children}</td>;
}

export default async function AdminPage() {
  await connection();
  const session = await getSession();
  if (!session || !isAdmin(session)) redirect('/');
  const db = getDb();
  const [accounts, spaces, balances, sites, reports, support, shadowCosts] = await Promise.all([
    db.select({ id: users.id, email: users.email, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)).limit(200),
    db.select({ id: workspaces.id, name: workspaces.name, ownerId: workspaces.ownerId }).from(workspaces).limit(200),
    db.select({ workspaceId: subscriptions.workspaceId, creditsRemaining: subscriptions.creditsRemaining }).from(subscriptions),
    // Un site par projet : la publication la plus récente (distinct on équivalent, tri desc puis premier par projet).
    db.select({ id: publications.id, projectId: publications.projectId, url: publications.url, status: publications.status, createdAt: publications.createdAt }).from(publications).orderBy(desc(publications.createdAt)).limit(500)
      .then((rows) => rows.filter((row, index, list) => list.findIndex((other) => other.projectId === row.projectId) === index).slice(0, 200)),
    db.select({ id: abuseReports.id, publicationId: abuseReports.publicationId, reason: abuseReports.reason, reporterEmail: abuseReports.reporterEmail, createdAt: abuseReports.createdAt }).from(abuseReports).orderBy(desc(abuseReports.createdAt)).limit(200),
    db.select({ id: supportRequests.id, email: supportRequests.email, subject: supportRequests.subject, status: supportRequests.status, createdAt: supportRequests.createdAt }).from(supportRequests).orderBy(desc(supportRequests.createdAt)).limit(200),
    db.select({ workspaceId: creditLedger.workspaceId, shadowCost: sql<number>`coalesce(sum(${creditLedger.shadowCost}), 0)` }).from(creditLedger).groupBy(creditLedger.workspaceId),
  ]);
  const ownerById = new Map(accounts.map((account) => [account.id, account.email]));
  const balanceByWorkspace = new Map(balances.map((balance) => [balance.workspaceId, balance.creditsRemaining]));
  const costByWorkspace = new Map(shadowCosts.map((cost) => [cost.workspaceId, Number(cost.shadowCost)]));

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="text-3xl font-semibold">Back-office Mihoji</h1>
      <p className="mt-1 text-sm text-slate-400">{accounts.length} utilisateur(s) · {spaces.length} espace(s) · {sites.length} site(s) publié(s)</p>

      <Section title="Utilisateurs">
        <table className="w-full">
          <thead><tr className="border-b border-slate-800"><Th>Email</Th><Th>Inscrit le</Th></tr></thead>
          <tbody>{accounts.map((account) => <tr key={account.id} className="border-b border-slate-800/50"><Td>{account.email}</Td><Td>{formatDate(account.createdAt)}</Td></tr>)}</tbody>
        </table>
      </Section>

      <Section title="Espaces et crédits">
        <table className="w-full">
          <thead><tr className="border-b border-slate-800"><Th>Espace</Th><Th>Propriétaire</Th><Th>Crédits restants</Th><Th>Coût IA estimé</Th><Th>Ajouter des crédits</Th></tr></thead>
          <tbody>{spaces.map((space) => (
            <tr key={space.id} className="border-b border-slate-800/50">
              <Td>{space.name}</Td>
              <Td>{ownerById.get(space.ownerId) ?? '—'}</Td>
              <Td>{(balanceByWorkspace.get(space.id) ?? 0).toLocaleString('fr-FR')}</Td>
              <Td>{formatAiCost(costByWorkspace.get(space.id) ?? 0)}</Td>
              <Td><AddCreditsForm workspaceId={space.id} /></Td>
            </tr>
          ))}</tbody>
        </table>
      </Section>

      <Section title="Sites publiés">
        <table className="w-full">
          <thead><tr className="border-b border-slate-800"><Th>URL</Th><Th>Statut</Th><Th>Action</Th></tr></thead>
          <tbody>{sites.map((site) => (
            <tr key={site.id} className="border-b border-slate-800/50">
              <Td><a href={site.url} className="text-indigo-300 hover:underline">{site.url}</a></Td>
              <Td>{site.status === 'published' ? 'En ligne' : site.status === 'suspended' ? 'Suspendu' : site.status}</Td>
              <Td><SuspendButton publicationId={site.id} status={site.status} /></Td>
            </tr>
          ))}</tbody>
        </table>
      </Section>

      <Section title="Signalements">
        {reports.length === 0 ? <p className="p-3 text-sm text-slate-500">Aucun signalement.</p> : (
          <table className="w-full">
            <thead><tr className="border-b border-slate-800"><Th>Raison</Th><Th>Signalé par</Th><Th>Le</Th></tr></thead>
            <tbody>{reports.map((report) => <tr key={report.id} className="border-b border-slate-800/50"><Td>{report.reason}</Td><Td>{report.reporterEmail ?? 'Anonyme'}</Td><Td>{formatDate(report.createdAt)}</Td></tr>)}</tbody>
          </table>
        )}
      </Section>

      <Section title="Demandes de support">
        {support.length === 0 ? <p className="p-3 text-sm text-slate-500">Aucune demande.</p> : (
          <table className="w-full">
            <thead><tr className="border-b border-slate-800"><Th>Email</Th><Th>Sujet</Th><Th>Statut</Th><Th>Le</Th></tr></thead>
            <tbody>{support.map((request) => <tr key={request.id} className="border-b border-slate-800/50"><Td>{request.email}</Td><Td>{request.subject}</Td><Td>{request.status === 'open' ? 'Ouverte' : 'Clôturée'}</Td><Td>{formatDate(request.createdAt)}</Td></tr>)}</tbody>
          </table>
        )}
      </Section>
    </main>
  );
}
