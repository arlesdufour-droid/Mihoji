import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/db/client';
import { abuseReports, chatMessages, companies, creditLedger, customDomains, onboardingStates, projectFiles, projectVersions, projects, publications, subscriptions, users, workspaceMembers, workspaces } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const session = await getSession();
  const body = await request.json().catch(() => null) as { confirmation?: string } | null;
  if (!session || session.isDemo) return NextResponse.json({ error: 'database_required' }, { status: 422 });
  if (body?.confirmation !== 'SUPPRIMER') return NextResponse.json({ error: 'confirmation_required' }, { status: 400 });
  const db = getDb();
  const projectRows = await db.select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, session.workspaceId));
  const projectIds = projectRows.map(({ id }) => id);
  await db.transaction(async (tx) => {
    if (projectIds.length) {
      await tx.delete(abuseReports).where(inArray(abuseReports.publicationId, tx.select({ id: publications.id }).from(publications).where(inArray(publications.projectId, projectIds))));
      await tx.delete(publications).where(inArray(publications.projectId, projectIds));
      await tx.delete(customDomains).where(inArray(customDomains.projectId, projectIds));
      await tx.delete(chatMessages).where(inArray(chatMessages.projectId, projectIds));
      await tx.delete(projectFiles).where(inArray(projectFiles.projectId, projectIds));
      await tx.delete(projectVersions).where(inArray(projectVersions.projectId, projectIds));
      await tx.delete(projects).where(inArray(projects.id, projectIds));
    }
    await tx.delete(companies).where(eq(companies.workspaceId, session.workspaceId));
    await tx.delete(onboardingStates).where(eq(onboardingStates.workspaceId, session.workspaceId));
    await tx.delete(creditLedger).where(eq(creditLedger.workspaceId, session.workspaceId));
    await tx.delete(subscriptions).where(eq(subscriptions.workspaceId, session.workspaceId));
    await tx.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, session.workspaceId));
    await tx.delete(workspaces).where(eq(workspaces.id, session.workspaceId));
    await tx.delete(users).where(eq(users.id, session.user.id));
  });
  const supabase = await getSupabaseServerClient();
  if (supabase) await supabase.auth.admin.deleteUser(session.user.id);
  return NextResponse.json({ ok: true });
}
