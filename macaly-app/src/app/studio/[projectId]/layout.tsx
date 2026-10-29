import { getCreditBalance } from '@/lib/billing/queries';
import { StudioShell } from '@/components/studio/studio-shell';
import { getSession } from '@/lib/auth';

export const instant = false;

export default async function StudioProjectLayout({ children, params }: LayoutProps<'/studio/[projectId]'>) {
  const { projectId } = await params;
  const balance = await getCreditBalance('demo-workspace');
  const session = await getSession();
  void children;
  return <StudioShell projectId={projectId} remaining={balance.remaining} isDemo={session?.isDemo ?? false} />;
}
