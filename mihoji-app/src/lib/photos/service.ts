import 'server-only';

import { and, eq, gt, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { photoCache } from '@/db/schema';
import type { SiteDescription } from '../site/schema';
import { assignPhotos, imageSlots } from './assign';
import { LocalLibraryProvider } from './local';
import { normalizeQuery, rankCandidates, simplerQueries } from './select';
import type { PhotoCandidate } from './types';
import { UnsplashProvider } from './unsplash';

// Résolution des photos d'un site : cache (base) → Unsplash (si clé et quota) → bibliothèque locale.
// En production, une clé absente n'est PAS remplacée par une simulation : la bibliothèque locale contient de vraies photos libres,
// et l'absence de clé est seulement journalisée ; le site reste complet.

const HOURLY_BUDGET = Number(process.env.UNSPLASH_HOURLY_BUDGET ?? 45); // l'offre démonstration autorise 50 requêtes par heure
const CACHE_DAYS = 30; // les photos d'un métier changent peu : un mois de cache économise le quota
const memory = new Map<string, PhotoCandidate[]>();

async function callsLastHour(): Promise<number> {
  const [row] = await getDb().select({ count: sql<number>`count(*)::int` }).from(photoCache)
    .where(and(eq(photoCache.source, 'unsplash'), gt(photoCache.fetchedAt, sql`now() - interval '1 hour'`)));
  return row?.count ?? 0;
}

async function cached(key: string): Promise<PhotoCandidate[] | null> {
  const hit = memory.get(key);
  if (hit) return hit;
  const [row] = await getDb().select().from(photoCache).where(and(eq(photoCache.query, key), gt(photoCache.fetchedAt, sql`now() - make_interval(days => ${CACHE_DAYS})`))).limit(1);
  if (!row) return null;
  const candidates = row.candidates as PhotoCandidate[];
  memory.set(key, candidates);
  return candidates;
}

async function store(key: string, source: 'unsplash' | 'local', candidates: PhotoCandidate[]): Promise<void> {
  memory.set(key, candidates);
  await getDb().insert(photoCache).values({ query: key, source, candidates }).onConflictDoUpdate({ target: photoCache.query, set: { source, candidates, fetchedAt: sql`now()` } });
}

export type PhotoReport = { requested: number; fromCache: number; unsplashCalls: number; fromLocal: number; unresolved: string[] };

// Remplit les emplacements d'images d'un site (requête, sans src) avec la meilleure photo de chaque requête.
// local : bibliothèque locale uniquement, sans cache ni Unsplash (banc d'essai : photos identiques d'une exécution à l'autre).
export async function resolveSitePhotos(site: SiteDescription, options: { offline?: boolean; local?: boolean } = {}): Promise<{ site: SiteDescription; report: PhotoReport }> {
  const queries = [...new Set(imageSlots(site).filter((slot) => slot.query && !slot.src).map((slot) => slot.query as string))];
  const report: PhotoReport = { requested: queries.length, fromCache: 0, unsplashCalls: 0, fromLocal: 0, unresolved: [] };
  const key = options.offline || options.local ? undefined : process.env.UNSPLASH_ACCESS_KEY; // offline : simulation et tests, aucun appel Unsplash
  const unsplash = key ? new UnsplashProvider(key) : null;
  const local = new LocalLibraryProvider();
  let budget = unsplash ? HOURLY_BUDGET - await callsLastHour() : 0;
  if (!unsplash && !options.offline && !options.local && queries.length) console.warn('UNSPLASH_ACCESS_KEY absente : photos de la bibliothèque locale uniquement.');
  const library = new Map<string, PhotoCandidate[]>();
  for (const query of queries) {
    const normalized = normalizeQuery(query);
    const hit = options.local ? null : await cached(normalized);
    if (hit?.length) {
      library.set(normalized, hit);
      report.fromCache += 1;
      continue;
    }
    let candidates: PhotoCandidate[] = [];
    let searched = false;
    // Un résultat vide déjà mémorisé évite de redépenser le quota sur une requête qui ne donne rien.
    if (unsplash && !hit) {
      // Requête complète, puis versions plus courtes si Unsplash ne renvoie rien (chaque essai coûte une requête du quota).
      for (const attempt of [normalized, ...simplerQueries(normalized)]) {
        if (budget <= 0 || candidates.length) break;
        try {
          const result = await unsplash.search(attempt);
          budget = Math.min(budget - 1, result.remaining === undefined ? budget - 1 : result.remaining - 5);
          report.unsplashCalls += 1;
          searched = true;
          candidates = rankCandidates(result.candidates, attempt, 8);
          if (candidates.length) await store(normalized, 'unsplash', candidates);
        } catch (error) {
          console.error('Unsplash search failed.', error);
          break;
        }
      }
    }
    if (!candidates.length && searched) await store(normalized, 'unsplash', []);
    if (!candidates.length) {
      candidates = rankCandidates((await local.search(normalized)).candidates, normalized, 8);
      if (candidates.length) report.fromLocal += 1;
      else report.unresolved.push(query);
    }
    library.set(normalized, candidates);
  }
  const { site: filled, used } = assignPhotos(site, library, normalizeQuery);
  // Signale à Unsplash les téléchargements effectifs (règle d'attribution), sans bloquer ni échouer la génération.
  if (unsplash) await Promise.allSettled(used.filter((photo) => photo.downloadLocation).map((photo) => unsplash.trackDownload(photo.downloadLocation!)));
  return { site: filled, report };
}
