import type { JudgeScores } from './benchmark-rubric';

// Logique pure du banc d'essai (rapport, uniformité, comparaison) : testée sans réseau ni base.

export type AuditSummary = { overflow: number; contrastFailures: number; imagesWithoutAlt: number; h1Count: number };
export type LighthouseScores = { performance: number; accessibility: number; seo: number; bestPractices: number };

export type SiteResult = {
  id: string;
  label: string;
  request: string;
  status: 'succeeded' | 'failed';
  error?: string;
  poorData?: string;
  generation: { id: string; costEur: number; attempts: number; durationMs: number; promptTokens: number; completionTokens: number; cacheReadTokens: number; cacheWriteTokens: number; model: string };
  style?: string;
  palette?: string;
  sections?: string[];
  modules?: string[];
  photos?: { requested: number; fromCache: number; unsplashCalls: number; fromLocal: number; unresolved: string[] };
  // Contrôles automatiques du rendu (pas des indicateurs de qualité).
  checks?: { desktop: AuditSummary; mobile: AuditSummary; filler: string[]; brokenImages: number };
  // Lighthouse : contrôle technique du rendu (poids, accessibilité, balisage), pas un indicateur de qualité.
  lighthouse?: { mobile?: LighthouseScores; desktop?: LighthouseScores; error?: string };
  judge?: { scores?: JudgeScores; mean?: number; costEur: number; promptTokens: number; completionTokens: number; error?: string };
};

export type Uniformity = {
  styles: Record<string, number>;
  palettes: Record<string, number>;
  // Sites partageant exactement la même séquence de types de section (groupes de 2 sites ou plus).
  sameSequenceGroups: { sequence: string[]; ids: string[] }[];
  sitesInSameSequenceGroup: number;
  distinctSequences: number;
};

export type BenchmarkResults = {
  benchmarkVersion: number;
  rubricVersion: number;
  runId: string;
  startedAt: string;
  photos: 'local' | 'unsplash';
  provider: string;
  model: string;
  effort: string;
  promptHash: string;
  totals: Totals;
  uniformity: Uniformity;
  sites: SiteResult[];
};

export type Totals = { sites: number; succeeded: number; generationCostEur: number; judgeCostEur: number; totalCostEur: number; averageGenerationCostEur: number; durationMs: number; judgeMean: number | null };

const round = (value: number, digits = 4) => Math.round(value * 10 ** digits) / 10 ** digits;

export function computeTotals(sites: SiteResult[]): Totals {
  const generationCostEur = sites.reduce((sum, site) => sum + site.generation.costEur, 0);
  const judgeCostEur = sites.reduce((sum, site) => sum + (site.judge?.costEur ?? 0), 0);
  const means = sites.map((site) => site.judge?.mean).filter((value): value is number => typeof value === 'number');
  return {
    sites: sites.length,
    succeeded: sites.filter((site) => site.status === 'succeeded').length,
    generationCostEur: round(generationCostEur, 6),
    judgeCostEur: round(judgeCostEur, 6),
    totalCostEur: round(generationCostEur + judgeCostEur, 6),
    averageGenerationCostEur: sites.length ? round(generationCostEur / sites.length, 6) : 0,
    durationMs: sites.reduce((sum, site) => sum + site.generation.durationMs, 0),
    judgeMean: means.length ? round(means.reduce((sum, value) => sum + value, 0) / means.length, 2) : null,
  };
}

function count(values: (string | undefined)[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const value of values) if (value) out[value] = (out[value] ?? 0) + 1;
  return out;
}

// Indicateur d'uniformité : répartition des styles et palettes, et sites qui partagent exactement la même suite de types de section.
export function computeUniformity(sites: SiteResult[]): Uniformity {
  const done = sites.filter((site) => site.status === 'succeeded' && site.sections?.length);
  const groups = new Map<string, { sequence: string[]; ids: string[] }>();
  for (const site of done) {
    const key = site.sections!.join('>');
    const group = groups.get(key) ?? { sequence: site.sections!, ids: [] };
    group.ids.push(site.id);
    groups.set(key, group);
  }
  const shared = [...groups.values()].filter((group) => group.ids.length > 1).sort((a, b) => b.ids.length - a.ids.length);
  return {
    styles: count(done.map((site) => site.style)),
    palettes: count(done.map((site) => (site.style && site.palette ? `${site.style}/${site.palette}` : undefined))),
    sameSequenceGroups: shared,
    sitesInSameSequenceGroup: shared.reduce((sum, group) => sum + group.ids.length, 0),
    distinctSequences: groups.size,
  };
}

export type Delta = { id: string; judgeMean: { before: number | null; after: number | null }; costEur: { before: number; after: number } };

// Comparaison de deux exécutions de la même version du banc, site par site.
export function compareRuns(before: BenchmarkResults, after: BenchmarkResults): { comparable: boolean; reason?: string; deltas: Delta[]; judgeMean: { before: number | null; after: number | null }; costEur: { before: number; after: number } } {
  const totals = { judgeMean: { before: before.totals.judgeMean, after: after.totals.judgeMean }, costEur: { before: before.totals.totalCostEur, after: after.totals.totalCostEur } };
  if (before.benchmarkVersion !== after.benchmarkVersion) return { comparable: false, reason: `versions du banc différentes (${before.benchmarkVersion} et ${after.benchmarkVersion})`, deltas: [], ...totals };
  if (before.rubricVersion !== after.rubricVersion) return { comparable: false, reason: `versions de la grille du juge différentes (${before.rubricVersion} et ${after.rubricVersion})`, deltas: [], ...totals };
  if (before.photos !== after.photos) return { comparable: false, reason: `sources de photos différentes (${before.photos} et ${after.photos})`, deltas: [], ...totals };
  const deltas = after.sites.flatMap((site) => {
    const previous = before.sites.find((candidate) => candidate.id === site.id);
    return previous ? [{ id: site.id, judgeMean: { before: previous.judge?.mean ?? null, after: site.judge?.mean ?? null }, costEur: { before: previous.generation.costEur, after: site.generation.costEur } }] : [];
  });
  return { comparable: true, deltas, ...totals };
}
