export function EnvironmentBadge() {
  const environment = process.env.APP_ENV === 'production' ? 'production' : 'development';
  if (environment === 'production') return null;
  return <span className="fixed bottom-3 right-3 z-50 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-200">development</span>;
}
