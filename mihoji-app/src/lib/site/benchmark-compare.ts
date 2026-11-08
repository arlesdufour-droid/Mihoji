// Comparaison par paires du banc d'essai (juge v2) : logique pure et testée. Le juge voit « Site A » et « Site B » sans savoir lequel est
// l'ancienne version ; l'ordre est tiré au hasard de façon ÉQUILIBRÉE (moitié des cas dans chaque sens) pour annuler le biais de position.

export const PAIR_CRITERIA = ['texte', 'distinctif', 'hierarchie', 'photos', 'credibilite'] as const;
export type PairCriterion = (typeof PAIR_CRITERIA)[number];

export type JudgeSide = 'A' | 'egal' | 'B';
export type PairOutcome = 'old_better' | 'equal' | 'new_better';
export type Order = 'old-first' | 'new-first';

type Rng = () => number;

// Assigne l'ordre d'affichage : exactement ⌈n/2⌉ ou ⌊n/2⌋ cas « ancienne version en A » (mélange de Fisher-Yates avec le générateur fourni).
export function assignOrders(caseIds: string[], rng: Rng = Math.random): Record<string, Order> {
  const shuffled = [...caseIds];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const half = Math.ceil(shuffled.length / 2);
  return Object.fromEntries(shuffled.map((id, index) => [id, index < half ? 'old-first' : 'new-first'])) as Record<string, Order>;
}

// Remet le verdict du juge (A / égal / B) dans le sens ancienne / nouvelle version.
export function toOutcome(side: JudgeSide, order: Order): PairOutcome {
  if (side === 'egal') return 'equal';
  const aIsOld = order === 'old-first';
  return (side === 'A') === aIsOld ? 'old_better' : 'new_better';
}

export type PairVerdict = { verdict: JudgeSide; raison: string };
export type PairResult = { caseId: string; order: Order; verdicts: Record<PairCriterion, PairVerdict>; costEur: number };

export type CriterionTally = { newBetter: number; equal: number; oldBetter: number; pValue: number | null };

// Probabilité exacte (test de signe bilatéral, égalités exclues) d'un écart au moins aussi grand sous l'hypothèse « aucune différence ».
export function signTestPValue(wins: number, losses: number): number | null {
  const n = wins + losses;
  if (n === 0) return null;
  const k = Math.min(wins, losses);
  let tail = 0;
  let coefficient = 1; // C(n, 0)
  for (let i = 0; i <= k; i += 1) {
    tail += coefficient;
    coefficient = (coefficient * (n - i)) / (i + 1);
  }
  return Math.min(1, (2 * tail) / 2 ** n);
}

export function aggregate(results: PairResult[]): Record<PairCriterion, CriterionTally> & { overall: CriterionTally } {
  const tally = (outcomes: PairOutcome[]): CriterionTally => {
    const newBetter = outcomes.filter((outcome) => outcome === 'new_better').length;
    const oldBetter = outcomes.filter((outcome) => outcome === 'old_better').length;
    return { newBetter, oldBetter, equal: outcomes.length - newBetter - oldBetter, pValue: signTestPValue(newBetter, oldBetter) };
  };
  const byCriterion = Object.fromEntries(PAIR_CRITERIA.map((criterion) => [criterion, tally(results.map((result) => toOutcome(result.verdicts[criterion].verdict, result.order)))])) as Record<PairCriterion, CriterionTally>;
  // Verdict global d'un cas : décidé par comptage des critères (jamais par le modèle).
  const overall = tally(results.map((result) => {
    const outcomes = PAIR_CRITERIA.map((criterion) => toOutcome(result.verdicts[criterion].verdict, result.order));
    const wins = outcomes.filter((outcome) => outcome === 'new_better').length;
    const losses = outcomes.filter((outcome) => outcome === 'old_better').length;
    return wins > losses ? 'new_better' : losses > wins ? 'old_better' : 'equal';
  }));
  return { ...byCriterion, overall };
}

// Biais de position : part des verdicts « A meilleur » parmi les verdicts tranchés (proche de 50 % si le juge n'a pas de préférence pour la première image).
export function positionBias(results: PairResult[]): { decided: number; aShare: number | null } {
  const sides = results.flatMap((result) => PAIR_CRITERIA.map((criterion) => result.verdicts[criterion].verdict)).filter((side) => side !== 'egal');
  return { decided: sides.length, aShare: sides.length ? sides.filter((side) => side === 'A').length / sides.length : null };
}

// Deux sites ne se comparent que s'ils répondent à la même demande pour le même cas.
export function isComparable(a: { id: string; request: string }, b: { id: string; request: string }): boolean {
  return a.id === b.id && a.request.trim() === b.request.trim();
}
