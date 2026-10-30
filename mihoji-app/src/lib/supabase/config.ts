export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isDemoMode() {
  return process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL;
}

export function canUseDemoData() {
  return isDemoMode();
}

export function requireServerConfig() {
  if (!process.env.DATABASE_URL) throw new Error('database_not_configured');
  if (!hasSupabaseConfig()) throw new Error('supabase_not_configured');
}
