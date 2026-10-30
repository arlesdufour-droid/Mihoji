import { getCreditBalance } from '@/lib/billing/queries';
import { StudioShell } from '@/components/studio/studio-shell';
import { getSession } from '@/lib/auth';
import { assertProjectAccess } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import type { ReactNode } from 'react';

export const instant = false;

export default async function StudioProjectLayout({ children, params }: { children: ReactNode; params: Promise<{ projectId: string }> }) {
  await connection();
  const { projectId } = await params;
  const session = await getSession();
  if (!session) notFound();
  try {
    await assertProjectAccess(session, projectId);
  } catch (error) {
    if (error instanceof Error && error.message === 'project_not_found') notFound();
    throw error;
  }
  const balance = await getCreditBalance(session.workspaceId);
  void children;
  return <StudioShell projectId={projectId} remaining={balance.remaining} isDemo={session.isDemo} email={session.user.email} />;
}
