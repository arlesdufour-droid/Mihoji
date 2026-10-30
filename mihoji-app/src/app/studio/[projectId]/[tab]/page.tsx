import { notFound } from 'next/navigation';

export const instant = false;
import { studioTabs } from '@/lib/studio-tabs';
import { SiteSettings } from '@/components/settings/site-settings';

export default async function StudioTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (!studioTabs.some((entry) => entry.id === tab)) notFound();
  if (tab === 'settings') return <SiteSettings project={null} />;
  return null;
}
