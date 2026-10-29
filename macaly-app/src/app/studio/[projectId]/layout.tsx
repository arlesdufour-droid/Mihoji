import { getCreditBalance } from '@/lib/billing/queries';
import { StudioShell } from '@/components/studio/studio-shell';

export const instant = false;

export default async function StudioProjectLayout({ children, params }: LayoutProps<'/studio/[projectId]'>) {
  const { projectId } = await params;
  const balance = await getCreditBalance('demo-workspace');
  void children;
  return <StudioShell projectId={projectId} remaining={balance.remaining} />;
}
