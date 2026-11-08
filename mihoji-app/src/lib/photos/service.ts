import 'server-only';

import { and, eq, gt, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { photoCache } from '@/db/schema';
import type { SiteDescription } from '../site/schema';
import { assignSlots, pendingSlots } from './assign';
import { LocalLibraryProvider } from './local';
import { hostPixabayPhotos } from './hosting';
import { PixabayProvider } from './pixabay';
import { pixabayWindow, unsplashAllowed } from './rate-window';
import { applyPhotoRules } from './rules';
import { normalizeQuery, rankCandidates, rankForSlot, simplerQueries } from './select';
import type { PhotoCandidate } from './types';
import { UnsplashProvider } from './unsplash';
import { verifyPhotos, VERIFY_BUDGET_EUR, type VerifySlot } from './verify';

// Résolution des photos d'un site : cache (base) → Unsplash (si clé et quota) → bibliothèque locale.
// En production, une clé absente n'est PAS remplacée par une simulation : la bibliothèque locale contient de vraies photos libres,
// et l'absence de clé est seulement journalisée ; le site reste complet.

const PIXABAY_PER_MINUTE = Number(process.env.PIXABAY_PER_MINUTE ?? 90); // limite de Pixabay : 100 requêtes par minute
const HOURLY_BUDGET = Number(process.env.UNSPLASH_HOURLY_BUDGET ?? 45); // l'offre démonstration autorise 50 requêtes par heure
// Unsplash n'est qu'un secours : au plus ce nombre d'appels par site, et jamais d'attente du quota (l'emplacement reste alors graphique).
const UNSPLASH_PER_SITE = Number(process.env.UNSPLASH_PER_SITE ?? 4);
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

async function store(key: string, source: 'unsplash' | 'pixabay' | 'local', candidates: PhotoCandidate[]): Promise<void> {
  memory.set(key, candidates);
  await getDb().insert(photoCache).values({ query: key, source, candidates }).onConflictDoUpdate({ target: photoCache.query, set: { source, candidates, fetchedAt: sql`now()` } });
}

export type PhotoReport = {
  requested: number; fromCache: number; unsplashCalls: number; pixabayCalls: number; hosted: number; hostFailed: number; fromLocal: number; unresolved: string[];
  /** Emplacements dont les candidates ont été contrôlées visuellement, et photos refusées par ce contrôle. */
  verified: number; rejected: number; visionCostEur: number; hiddenGalleries: number;
};

// patient : banc d'essai avec vraies photos. Le quota de Pixabay (100 requêtes par minute) est attendu au lieu d'être contourné.
// Unsplash, lui, n'est jamais attendu : simple secours, plafonné par site.
type Options = { offline?: boolean; local?: boolean; verify?: boolean; patient?: boolean; onWait?: (seconds: number) => void };

// Remplit les emplacements d'images d'un site (requête, sans src) avec la photo la plus pertinente de chaque emplacement.
// Chaque emplacement a 1 à 3 formulations (requête + alternatives) : on compare toutes les photos trouvées, on garde les 3 meilleures
// par mots-clés puis on les fait contrôler visuellement par un modèle léger. Aucune photo douteuse n'est utilisée :
// l'emplacement reste vide (visuel graphique aux couleurs du thème) et une galerie sans 3 bonnes photos est masquée.
// local : bibliothèque locale uniquement, sans cache ni Unsplash (banc d'essai : mêmes candidates d'une exécution à l'autre).
export async function resolveSitePhotos(site: SiteDescription, options: Options = {}): Promise<{ site: SiteDescription; report: PhotoReport }> {
  const slots = pendingSlots(site);
  const primaries = [...new Set(slots.map((slot) => normalizeQuery(slot.query as string)))];
  const alternatives = [...new Set(slots.flatMap((slot) => (slot.alternatives ?? []).map(normalizeQuery)))].filter((query) => query && !primaries.includes(query));
  const report: PhotoReport = { requested: primaries.length + alternatives.length, fromCache: 0, unsplashCalls: 0, pixabayCalls: 0, hosted: 0, hostFailed: 0, fromLocal: 0, unresolved: [], verified: 0, rejected: 0, visionCostEur: 0, hiddenGalleries: 0 };
  const remote = !options.offline && !options.local; // offline : simulation et tests, aucun appel réseau
  const unsplashKey = remote ? process.env.UNSPLASH_ACCESS_KEY : undefined;
  const pixabayKey = remote ? process.env.PIXABAY_API_KEY : undefined;
  const unsplash = unsplashKey ? new UnsplashProvider(unsplashKey) : null;
  const pixabay = pixabayKey ? new PixabayProvider(pixabayKey) : null;
  let pixabayAvailable = Boolean(pixabay);
  const local = new LocalLibraryProvider();
  let budget = unsplash ? HOURLY_BUDGET - await callsLastHour() : 0;
  if (!unsplash && !pixabay && remote && primaries.length) console.warn('UNSPLASH_ACCESS_KEY et PIXABAY_API_KEY absentes : photos de la bibliothèque locale uniquement.');
  const library = new Map<string, PhotoCandidate[]>();

  const fetchQuery = async (normalized: string, optional: boolean) => {
    const hit = options.local || options.offline ? null : await cached(normalized); // simulation et banc « local » : jamais le cache, pour des résultats reproductibles
    if (hit?.length) { library.set(normalized, hit); report.fromCache += 1; return; }
    let fromUnsplash: PhotoCandidate[] = [];
    let fromPixabay: PhotoCandidate[] = [];
    let searched = false;
    // Pixabay : rapide (100 requêtes par minute), essayé pour toutes les formulations. Ses photos seront téléchargées et hébergées si elles sont retenues.
    if (pixabay && pixabayAvailable && !hit) {
      for (const attempt of [normalized, ...(optional ? [] : simplerQueries(normalized))]) {
        if (!pixabayAvailable || fromPixabay.length) break;
        try {
          if (options.patient) await pixabayWindow.take(PIXABAY_PER_MINUTE, Date.now, undefined, options.onWait);
          const result = await pixabay.search(attempt);
          report.pixabayCalls += 1;
          searched = true;
          fromPixabay = rankCandidates(result.candidates, attempt, 8, { trusted: true }).map((candidate) => ({ ...candidate, tags: [...candidate.tags, attempt] }));
        } catch (error) {
          console.error('Pixabay search failed.', error);
          pixabayAvailable = false; // 429 ou panne : on continue sans Pixabay pour le reste de ce site
        }
      }
    }
    // Unsplash = secours : seulement si Pixabay est absent, en panne ou n'a rien trouvé, dans la limite de UNSPLASH_PER_SITE appels par site
    // et du quota horaire restant. On n'attend jamais le quota : sans réponse, l'emplacement reste graphique (ou local).
    const wantsUnsplash = unsplash && !hit && fromPixabay.length === 0;
    if (wantsUnsplash) {
      for (const attempt of [normalized, ...(optional ? [] : simplerQueries(normalized))]) {
        if (!unsplashAllowed(budget, report.unsplashCalls, UNSPLASH_PER_SITE) || fromUnsplash.length) break;
        try {
          const result = await unsplash.search(attempt);
          budget = Math.min(budget - 1, result.remaining === undefined ? budget - 1 : result.remaining - 5);
          report.unsplashCalls += 1;
          searched = true;
          fromUnsplash = rankCandidates(result.candidates, attempt, 8, { trusted: true }).map((candidate) => ({ ...candidate, tags: [...candidate.tags, attempt] }));
        } catch (error) {
          console.error('Unsplash search failed.', error);
          break;
        }
      }
    }
    // Les deux fournisseurs sont combinés (une photo de chaque, tour à tour) : le contrôle visuel choisit ensuite.
    const interleaved: PhotoCandidate[] = [];
    for (let i = 0; i < Math.max(fromUnsplash.length, fromPixabay.length); i += 1) interleaved.push(...[fromUnsplash[i], fromPixabay[i]].filter((photo): photo is PhotoCandidate => Boolean(photo)));
    let candidates = interleaved.slice(0, 10);
    if (candidates.length) await store(normalized, fromPixabay.length ? 'pixabay' : 'unsplash', candidates);
    else if (searched) await store(normalized, fromUnsplash.length || report.unsplashCalls > 0 ? 'unsplash' : 'pixabay', []);
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

  // Secours Unsplash : emplacements restés sans photo pertinente (rien trouvé, ou tout refusé par le contrôle visuel). Plafonné, sans attente.
  if (unsplash && !options.local && !options.offline && options.verify !== false) {
    const empty = choices.map((candidates, id) => (candidates.length === 0 ? id : -1)).filter((id) => id >= 0);
    const rescue: VerifySlot[] = [];
    for (const id of empty) {
      if (!unsplashAllowed(budget, report.unsplashCalls, UNSPLASH_PER_SITE)) break;
      const query = normalizeQuery(slots[id].query as string);
      try {
        const result = await unsplash.search(query);
        budget = Math.min(budget - 1, result.remaining === undefined ? budget - 1 : result.remaining - 5);
        report.unsplashCalls += 1;
        const found = rankForSlot(rankCandidates(result.candidates, query, 8, { trusted: true }), [query], 3);
        if (found.length) rescue.push({ id, subject: `${slots[id].alt} (recherche : ${slots[id].query})`, candidates: found });
      } catch (error) {
        console.error('Unsplash rescue failed.', error);
        break;
      }
    }
    if (rescue.length) {
      const outcome = await verifyPhotos(rescue);
      report.visionCostEur += outcome.costEur;
      if (outcome.verdicts) {
        choices = choices.map((candidates, id) => {
          const entry = rescue.find((item) => item.id === id);
          const verdict = outcome.verdicts!.find((item) => item.id === id);
          return entry && verdict ? verdict.accepted.map((index) => entry.candidates[index]) : candidates;
        });
      }
    }
  }

  const assigned = assignSlots(site, choices);
  report.unresolved = assigned.missing;
  // Conditions de l'API Pixabay : les photos retenues sont téléchargées et hébergées par Mihoji.
  const hosting = await hostPixabayPhotos(assigned.site, assigned.used);
  report.hosted = hosting.hosted;
  report.hostFailed = hosting.failed;
  const { site: ruled, hiddenGalleries } = applyPhotoRules(hosting.site);
  report.hiddenGalleries = hiddenGalleries;
  // Signale à Unsplash les téléchargements effectifs (règle d'attribution), sans bloquer ni échouer la génération.
  if (unsplash) await Promise.allSettled(assigned.used.filter((photo) => photo.downloadLocation).map((photo) => unsplash.trackDownload(photo.downloadLocation!)));
  return { site: ruled, report };
}
