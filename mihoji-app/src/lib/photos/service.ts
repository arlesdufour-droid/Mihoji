import 'server-only';

import { and, eq, gt, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { photoCache } from '@/db/schema';
import type { SiteDescription } from '../site/schema';
import { assignSlots, pendingSlots } from './assign';
import { LocalLibraryProvider } from './local';
import { applyPhotoRules } from './rules';
import { normalizeQuery, rankCandidates, rankForSlot, simplerQueries } from './select';
import type { PhotoCandidate } from './types';
import { UnsplashProvider } from './unsplash';
import { verifyPhotos, VERIFY_BUDGET_EUR, type VerifySlot } from './verify';

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

export type PhotoReport = {
  requested: number; fromCache: number; unsplashCalls: number; fromLocal: number; unresolved: string[];
  /** Emplacements dont les candidates ont été contrôlées visuellement, et photos refusées par ce contrôle. */
  verified: number; rejected: number; visionCostEur: number; hiddenGalleries: number;
};

type Options = { offline?: boolean; local?: boolean; verify?: boolean };

// Remplit les emplacements d'images d'un site (requête, sans src) avec la photo la plus pertinente de chaque emplacement.
// Chaque emplacement a 1 à 3 formulations (requête + alternatives) : on compare toutes les photos trouvées, on garde les 3 meilleures
// par mots-clés puis on les fait contrôler visuellement par un modèle léger. Aucune photo douteuse n'est utilisée :
// l'emplacement reste vide (visuel graphique aux couleurs du thème) et une galerie sans 3 bonnes photos est masquée.
// local : bibliothèque locale uniquement, sans cache ni Unsplash (banc d'essai : mêmes candidates d'une exécution à l'autre).
export async function resolveSitePhotos(site: SiteDescription, options: Options = {}): Promise<{ site: SiteDescription; report: PhotoReport }> {
  const slots = pendingSlots(site);
  const primaries = [...new Set(slots.map((slot) => normalizeQuery(slot.query as string)))];
  const alternatives = [...new Set(slots.flatMap((slot) => (slot.alternatives ?? []).map(normalizeQuery)))].filter((query) => query && !primaries.includes(query));
  const report: PhotoReport = { requested: primaries.length + alternatives.length, fromCache: 0, unsplashCalls: 0, fromLocal: 0, unresolved: [], verified: 0, rejected: 0, visionCostEur: 0, hiddenGalleries: 0 };
  const key = options.offline || options.local ? undefined : process.env.UNSPLASH_ACCESS_KEY; // offline : simulation et tests, aucun appel Unsplash
  const unsplash = key ? new UnsplashProvider(key) : null;
  const local = new LocalLibraryProvider();
  let budget = unsplash ? HOURLY_BUDGET - await callsLastHour() : 0;
  if (!unsplash && !options.offline && !options.local && primaries.length) console.warn('UNSPLASH_ACCESS_KEY absente : photos de la bibliothèque locale uniquement.');
  const library = new Map<string, PhotoCandidate[]>();

  const fetchQuery = async (normalized: string, optional: boolean) => {
    const hit = options.local ? null : await cached(normalized);
    if (hit?.length) { library.set(normalized, hit); report.fromCache += 1; return; }
    let candidates: PhotoCandidate[] = [];
    let searched = false;
    // Un résultat vide déjà mémorisé évite de redépenser le quota sur une requête qui ne donne rien.
    // Les formulations alternatives ne consomment que le quota restant au-delà d'une réserve de 8 requêtes.
    if (unsplash && !hit && (!optional || budget > 8)) {
      // Requête complète, puis versions plus courtes si Unsplash ne renvoie rien (chaque essai coûte une requête du quota).
      for (const attempt of [normalized, ...(optional ? [] : simplerQueries(normalized))]) {
        if (budget <= 0 || candidates.length) break;
        try {
          const result = await unsplash.search(attempt);
          budget = Math.min(budget - 1, result.remaining === undefined ? budget - 1 : result.remaining - 5);
          report.unsplashCalls += 1;
          searched = true;
          candidates = rankCandidates(result.candidates, attempt, 8, { trusted: true }).map((candidate) => ({ ...candidate, tags: [...candidate.tags, attempt] }));
          if (candidates.length) await store(normalized, 'unsplash', candidates);
        } catch (error) {
          console.error('Unsplash search failed.', error);
          break;
        }
      }
    }
    if (!candidates.length && searched) await store(normalized, 'unsplash', []);
    if (!candidates.length) {
      candidates = rankCandidates((await local.search(normalized)).candidates, normalized, 8, { trusted: true });
      if (candidates.length) report.fromLocal += 1;
    }
    library.set(normalized, candidates);
  };
  for (const query of primaries) await fetchQuery(query, false);
  for (const query of alternatives) await fetchQuery(query, true);

  // Les 3 meilleures candidates de chaque emplacement, toutes formulations confondues.
  const ranked = slots.map((slot) => {
    const queries = [slot.query as string, ...(slot.alternatives ?? [])].map(normalizeQuery);
    const pool = [...new Map(queries.flatMap((query) => library.get(query) ?? []).map((candidate) => [candidate.src, candidate])).values()];
    return rankForSlot(pool, queries, 3);
  });

  // Contrôle visuel (un seul appel pour tout le site). Sans contrôle possible (simulation, pas de clé, panne), le classement par mots-clés fait foi.
  let choices = ranked;
  if (options.verify !== false && !options.offline) {
    const toCheck: VerifySlot[] = ranked.map((candidates, id) => ({ id, subject: `${slots[id].alt} (recherche : ${slots[id].query})`, candidates })).filter((entry) => entry.candidates.length > 0);
    if (toCheck.length) {
      const outcome = await verifyPhotos(toCheck);
      report.visionCostEur = outcome.costEur;
      if (outcome.costEur > VERIFY_BUDGET_EUR) console.warn(`Contrôle des photos plus cher que prévu : ${outcome.costEur} €.`);
      if (outcome.verdicts) {
        report.verified = toCheck.length;
        choices = ranked.map((candidates, id) => {
          const verdict = outcome.verdicts!.find((entry) => entry.id === id);
          if (!verdict) return candidates;
          const accepted = verdict.accepted.map((index) => candidates[index]);
          report.rejected += candidates.length - accepted.length;
          return accepted;
        });
      }
    }
  }

  const assigned = assignSlots(site, choices);
  report.unresolved = assigned.missing;
  const { site: ruled, hiddenGalleries } = applyPhotoRules(assigned.site);
  report.hiddenGalleries = hiddenGalleries;
  // Signale à Unsplash les téléchargements effectifs (règle d'attribution), sans bloquer ni échouer la génération.
  if (unsplash) await Promise.allSettled(assigned.used.filter((photo) => photo.downloadLocation).map((photo) => unsplash.trackDownload(photo.downloadLocation!)));
  return { site: ruled, report };
}
