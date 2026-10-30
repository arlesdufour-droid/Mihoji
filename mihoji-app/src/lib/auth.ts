import 'server-only';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/supabase/config';
import { demoWorkspaceId } from '@/lib/billing/demo-data';
import { getDb } from '@/db/client';
import { projects, subscriptions, users, workspaceMembers, workspaces } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { plans } from '@/lib/plans';

export type AppSession = {
  user: { id: string; email?: string };
  workspaceId: string;
  role: 'owner' | 'admin' | 'member';
  isDemo: boolean;
  workspaceName: string;
};

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getLatestProjectPath(session: AppSession) {
  if (session.isDemo) return null;
  const [project] = await getDb().select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, session.workspaceId)).orderBy(desc(projects.createdAt)).limit(1);
  return project ? `/studio/${project.id}/preview` : null;
}

export async function getSession(): Promise<AppSession | null> {
  if (isDemoMode()) {
    return { user: { id: 'demo-user', email: 'demo@mihoji.local' }, workspaceId: demoWorkspaceId, role: 'owner', isDemo: true, workspaceName: 'Mon espace' };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const db = getDb();
  await db.insert(users).values({ id: data.user.id, email: data.user.email ?? '' }).onConflictDoNothing({ target: users.id });
  let [membership] = await db.select({ workspaceId: workspaceMembers.workspaceId, role: workspaceMembers.role }).from(workspaceMembers).where(eq(workspaceMembers.userId, data.user.id)).limit(1);
  if (!membership) {
    const [workspace] = await db.insert(workspaces).values({ name: data.user.email ? `${data.user.email} workspace` : 'Mon espace', ownerId: data.user.id }).returning({ id: workspaces.id });
    if (!workspace) throw new Error('workspace_creation_failed');
    await db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId: data.user.id, role: 'owner' });
    await db.insert(subscriptions).values({ workspaceId: workspace.id, planId: 'free', monthlyAllowance: plans.find((plan) => plan.id === 'free')?.credits ?? 0, creditsRemaining: plans.find((plan) => plan.id === 'free')?.credits ?? 0, periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
    membership = { workspaceId: workspace.id, role: 'owner' };
  }
  const [workspace] = await db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, membership.workspaceId)).limit(1);
  return { user: { id: data.user.id, email: data.user.email }, workspaceId: membership.workspaceId, role: membership.role, isDemo: false, workspaceName: workspace?.name ?? 'Mon espace' };
}

export async function assertProjectAccess(session: AppSession, projectId: string): Promise<void> {
  if (!isUuid(projectId)) throw new Error('project_not_found');
  if (session.isDemo) return;
  const [project] = await getDb().select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.workspaceId, session.workspaceId))).limit(1);
  if (!project) throw new Error('project_not_found');
}
