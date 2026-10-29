import 'server-only';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/supabase/config';
import { demoWorkspaceId } from '@/lib/billing/demo-data';

export type AppSession = {
  user: { id: string; email?: string };
  workspaceId: string;
  isDemo: boolean;
};

export async function getSession(): Promise<AppSession | null> {
  if (isDemoMode()) {
    return { user: { id: 'demo-user', email: 'demo@mihoji.local' }, workspaceId: demoWorkspaceId, isDemo: true };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return { user: { id: data.user.id, email: data.user.email }, workspaceId: data.user.user_metadata?.workspace_id ?? data.user.id, isDemo: false };
}
