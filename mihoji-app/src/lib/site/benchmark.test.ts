import { describe, expect, it } from 'vitest';
import { BENCHMARK_VERSION, benchmarkCases } from './benchmark-cases';
import { RUBRIC_VERSION, judgeMean, judgeSchema, judgeSystemPrompt, rubricCriteria } from './benchmark-rubric';
import { compareRuns, computeTotals, computeUniformity, type BenchmarkResults, type SiteResult } from './benchmark';
import { nafLabel } from '@/lib/company/lookup';

function site(id: string, sections: string[], style: string, palette: string, extra: Partial<SiteResult> = {}): SiteResult {
  return { id, label: id, request: 'r', status: 'succeeded', sections, style, palette, generation: { id, costEur: 0.04, attempts: 1, durationMs: 1000, promptTokens: 1, completionTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0, model: 'm' }, ...extra };
}

describe('cas du banc d’essai', () => {
  it('compte 12 cas figés, aux identifiants uniques et aux métiers variés', () => {
    expect(BENCHMARK_VERSION).toBe(2);
    expect(benchmarkCases).toHaveLength(12);
    expect(new Set(benchmarkCases.map((item) => item.id)).size).toBe(12);
    expect(new Set(benchmarkCases.map((item) => item.company.activity)).size).toBe(12);
    for (const item of benchmarkCases) {
      expect(item.request.trim().length).toBeGreaterThanOrEqual(8);
      expect(item.company.phone).toMatch(/\d/);
    }
  });

  it('contient deux cas à données pauvres : code NAF brut et demande d’une ligne', () => {
    const naf = benchmarkCases.find((item) => item.poorData === 'naf-brut')!;
    expect(nafLabel(naf.company.activity)).toBe(naf.company.activity);
    expect(naf.company.activity).toMatch(/^\d{2}\.\d{2}[A-Z]$/);
    const short = benchmarkCases.find((item) => item.poorData === 'demande-courte')!;
    expect(short.request.split(/\r?\n/)).toHaveLength(1);
    expect(short.request.length).toBeLessThan(60);
  });
});

describe('grille du juge', () => {
  it('est versionnée et couvre les cinq critères demandés', () => {
    expect(RUBRIC_VERSION).toBe(1);
    expect(rubricCriteria.map((criterion) => criterion.key)).toEqual(['texte', 'distinctif', 'hierarchie', 'photos', 'credibilite']);
    for (const criterion of rubricCriteria) expect(judgeSystemPrompt).toContain(`"${criterion.key}"`);
    expect(judgeSystemPrompt).toContain('contacterait-il cette entreprise');
  });

  it('valide des notes entières de 1 à 5 avec une justification', () => {
    const entry = (note: number) => ({ note, raison: 'Une phrase.' });
    const ok = { texte: entry(4), distinctif: entry(2), hierarchie: entry(3), photos: entry(5), credibilite: entry(1) };
    expect(judgeSchema.safeParse(ok).success).toBe(true);
    expect(judgeMean(ok)).toBe(3);
    expect(judgeSchema.safeParse({ ...ok, texte: entry(6) }).success).toBe(false);
    expect(judgeSchema.safeParse({ ...ok, texte: entry(2.5) }).success).toBe(false);
    expect(judgeSchema.safeParse({ ...ok, photos: { note: 3, raison: '' } }).success).toBe(false);
  });
});

describe('rapport', () => {
  it('additionne les coûts de génération et du juge, et la note moyenne', () => {
    const totals = computeTotals([
      site('a', ['hero'], 'artisan', 'x', { judge: { mean: 4, costEur: 0.02, promptTokens: 1, completionTokens: 1 } }),
      site('b', ['hero'], 'moderne', 'y', { generation: { ...site('b', [], '', '').generation, costEur: 0.06 }, judge: { mean: 3, costEur: 0.01, promptTokens: 1, completionTokens: 1 } }),
      site('c', [], '', '', { status: 'failed' }),
    ]);
    expect(totals).toMatchObject({ sites: 3, succeeded: 2, generationCostEur: 0.14, judgeCostEur: 0.03, totalCostEur: 0.17, judgeMean: 3.5 });
    expect(totals.averageGenerationCostEur).toBeCloseTo(0.0467, 3);
  });

  it('mesure l’uniformité : répartition des styles et sites à la même séquence de sections', () => {
    const result = computeUniformity([
      site('a', ['hero', 'about', 'footer'], 'artisan', 'terracotta'),
      site('b', ['hero', 'about', 'footer'], 'artisan', 'terracotta'),
      site('c', ['hero', 'about', 'footer'], 'moderne', 'bleu'),
      site('d', ['hero', 'faq', 'footer'], 'moderne', 'bleu'),
      site('e', [], '', '', { status: 'failed' }),
    ]);
    expect(result.styles).toEqual({ artisan: 2, moderne: 2 });
    expect(result.palettes).toEqual({ 'artisan/terracotta': 2, 'moderne/bleu': 2 });
    expect(result.sameSequenceGroups).toEqual([{ sequence: ['hero', 'about', 'footer'], ids: ['a', 'b', 'c'] }]);
    expect(result.sitesInSameSequenceGroup).toBe(3);
    expect(result.distinctSequences).toBe(2);
  });
});

describe('comparaison avant/après', () => {
  const run = (overrides: Partial<BenchmarkResults>, sites: SiteResult[]): BenchmarkResults => ({
    benchmarkVersion: 1, rubricVersion: 1, runId: 'r', startedAt: '', photos: 'local', provider: 'anthropic', model: 'm', effort: 'medium', promptHash: 'h',
    totals: computeTotals(sites), uniformity: computeUniformity(sites), sites, ...overrides,
  });

  it('calcule l’écart par site quand versions et source de photos coïncident', () => {
    const before = run({}, [site('a', ['hero'], 'artisan', 'x', { judge: { mean: 3, costEur: 0.01, promptTokens: 1, completionTokens: 1 } })]);
    const after = run({}, [site('a', ['hero'], 'artisan', 'x', { judge: { mean: 4, costEur: 0.01, promptTokens: 1, completionTokens: 1 } })]);
    const comparison = compareRuns(before, after);
    expect(comparison.comparable).toBe(true);
    expect(comparison.deltas).toEqual([{ id: 'a', judgeMean: { before: 3, after: 4 }, costEur: { before: 0.04, after: 0.04 } }]);
  });

  it('refuse de comparer des versions ou des sources de photos différentes', () => {
    const base = run({}, [site('a', ['hero'], 'artisan', 'x')]);
    expect(compareRuns(base, run({ benchmarkVersion: 2 }, base.sites)).comparable).toBe(false);
    expect(compareRuns(base, run({ rubricVersion: 2 }, base.sites)).comparable).toBe(false);
    expect(compareRuns(base, run({ photos: 'unsplash' }, base.sites)).reason).toContain('photos');
  });
});
