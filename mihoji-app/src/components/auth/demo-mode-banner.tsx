import { isDemoMode } from '@/lib/supabase/config';

export function DemoModeBanner() {
  if (!isDemoMode()) return null;
  return <div className="border-b border-amber-400/20 bg-amber-400/10 px-4 py-2 text-center text-xs text-amber-200">Demo mode — les données sont locales et temporaires.</div>;
}
