import { notFound } from 'next/navigation';
import { studioTabs } from '@/lib/studio-tabs';

export default async function StudioTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (!studioTabs.some((entry) => entry.id === tab)) notFound();
  return null;
}
