// Durée de vie du cache des recherches de photos (logique pure, testée) : les adresses d'images de Pixabay EXPIRENT (HTTP 400 constaté après 8 jours) et
// ses conditions d'utilisation demandent un cache de 24 heures au plus ; celles d'Unsplash restent valables, d'où un mois de cache.
export const PIXABAY_CACHE_HOURS = 24;
export const UNSPLASH_CACHE_DAYS = 30;

// Une entrée de cache qui contient ne serait-ce qu'une adresse Pixabay suit la règle de Pixabay : d'anciennes entrées « mixtes » (Unsplash et Pixabay entrelacés)
// étaient enregistrées comme « unsplash » tout en contenant des adresses Pixabay qui ont expiré.
export function effectiveCacheSource(rowSource: string, srcs: string[]): string {
  return srcs.some((src) => /^https:\/\/(?:[\w-]+\.)?pixabay\.com\//i.test(src)) ? 'pixabay' : rowSource;
}

export function isCacheFresh(source: string, fetchedAt: Date, now = new Date()): boolean {
  const ageMs = now.getTime() - fetchedAt.getTime();
  if (ageMs < 0) return true;
  if (source === 'pixabay') return ageMs <= PIXABAY_CACHE_HOURS * 3_600_000;
  return ageMs <= UNSPLASH_CACHE_DAYS * 86_400_000;
}
