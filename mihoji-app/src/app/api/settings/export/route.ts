import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/db/client';
import { companies, creditLedger, projects, publications, subscriptions, workspaces } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getExportHeaders } from '@/lib/settings/export';

export async function GET() {
  const session = await getSession();
  if (!session || session.isDemo) return NextResponse.json({ error: 'database_required' }, { status: 422 });
  const db = getDb();
  const [workspace, company, subscription, projectRows, publicationRows, ledger] = await Promise.all([
    db.select().from(workspaces).where(eq(workspaces.id, session.workspaceId)),
    db.select().from(companies).where(eq(companies.workspaceId, session.workspaceId)),
    db.select().from(subscriptions).where(eq(subscriptions.workspaceId, session.workspaceId)),
    db.select().from(projects).where(eq(projects.workspaceId, session.workspaceId)),
    db.select({ publication: publications }).from(publications).innerJoin(projects, eq(publications.projectId, projects.id)).where(eq(projects.workspaceId, session.workspaceId)),
    db.select().from(creditLedger).where(eq(creditLedger.workspaceId, session.workspaceId)),
  ]);
  return new NextResponse(JSON.stringify({ user: session.user, workspace, company, subscription, projects: projectRows, publications: publicationRows, creditLedger: ledger }), { headers: getExportHeaders() });
}
