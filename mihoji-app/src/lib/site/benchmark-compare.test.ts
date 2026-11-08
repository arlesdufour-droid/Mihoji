import { describe, expect, it } from 'vitest';
import { aggregate, assignOrders, isComparable, positionBias, signTestPValue, toOutcome, type PairResult, type PairVerdict } from './benchmark-compare';

// Générateur pseudo-aléatoire déterministe pour les tests (mulberry32).
const seeded = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const verdicts = (side: PairVerdict['verdict']) => ({ texte: { verdict: side, raison: 'r' }, distinctif: { verdict: side, raison: 'r' }, hierarchie: { verdict: side, raison: 'r' }, photos: { verdict: side, raison: 'r' }, credibilite: { verdict: side, raison: 'r' } });

describe('ordre A/B', () => {
  it('est équilibré : la moitié des cas dans chaque sens, quel que soit le nombre de cas', () => {
    for (const n of [4, 11, 12]) {
      const orders = Object.values(assignOrders(Array.from({ length: n }, (_, i) => `cas${i}`), seeded(n)));
      const oldFirst = orders.filter((order) => order === 'old-first').length;
      expect(Math.abs(oldFirst - (n - oldFirst))).toBeLessThanOrEqual(1);
    }
  });
  it('varie d’un tirage à l’autre (ce n’est pas toujours le même ordre)', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `cas${i}`);
    expect(JSON.stringify(assignOrders(ids, seeded(1)))).not.toBe(JSON.stringify(assignOrders(ids, seeded(2))));
  });
  it('attribue un ordre à chaque cas, sans oubli ni doublon', () => {
    const ids = ['a', 'b', 'c'];
    expect(Object.keys(assignOrders(ids, seeded(3))).sort()).toEqual(ids);
  });
});

describe('remise des verdicts dans le bon sens', () => {
  it('« A meilleur » = ancienne version meilleure quand l’ancienne était en A, et inversement', () => {
    expect(toOutcome('A', 'old-first')).toBe('old_better');
    expect(toOutcome('B', 'old-first')).toBe('new_better');
    expect(toOutcome('A', 'new-first')).toBe('new_better');
    expect(toOutcome('B', 'new-first')).toBe('old_better');
    expect(toOutcome('egal', 'old-first')).toBe('equal');
    expect(toOutcome('egal', 'new-first')).toBe('equal');
  });
});

describe('agrégation', () => {
  const result = (caseId: string, order: PairResult['order'], side: PairVerdict['verdict']): PairResult => ({ caseId, order, verdicts: verdicts(side), costEur: 0.03 });
  it('compte victoires, égalités et défaites de la nouvelle version par critère, en tenant compte de l’ordre', () => {
    const tally = aggregate([result('a', 'old-first', 'B'), result('b', 'new-first', 'A'), result('c', 'old-first', 'egal'), result('d', 'new-first', 'B')]);
    expect(tally.photos).toMatchObject({ newBetter: 2, equal: 1, oldBetter: 1 });
    expect(tally.overall).toMatchObject({ newBetter: 2, equal: 1, oldBetter: 1 });
  });
  it('le verdict global d’un cas se décide par comptage des critères, pas par le modèle', () => {
    const mixed: PairResult = { caseId: 'x', order: 'old-first', costEur: 0, verdicts: { ...verdicts('egal'), texte: { verdict: 'B', raison: 'r' }, photos: { verdict: 'B', raison: 'r' }, hierarchie: { verdict: 'A', raison: 'r' } } };
    expect(aggregate([mixed]).overall).toMatchObject({ newBetter: 1, oldBetter: 0, equal: 0 });
  });
  it('mesure le biais de position : part des « A meilleur » parmi les verdicts tranchés', () => {
    expect(positionBias([result('a', 'old-first', 'A'), result('b', 'old-first', 'B')])).toEqual({ decided: 10, aShare: 0.5 });
    expect(positionBias([result('a', 'old-first', 'egal')])).toEqual({ decided: 0, aShare: null });
    expect(positionBias([result('a', 'old-first', 'A')]).aShare).toBe(1);
  });
});

describe('test de signe', () => {
  it('valeurs exactes connues (bilatéral, égalités exclues)', () => {
    expect(signTestPValue(0, 0)).toBeNull();
    expect(signTestPValue(5, 5)).toBe(1);
    expect(signTestPValue(10, 0)).toBeCloseTo(2 / 1024, 6);
    expect(signTestPValue(8, 2)).toBeCloseTo(0.109375, 6);
    expect(signTestPValue(0, 12)).toBeCloseTo(2 / 4096, 8);
  });
});

describe('cas comparables', () => {
  it('même cas et même demande seulement', () => {
    expect(isComparable({ id: 'plombier', request: 'Un site' }, { id: 'plombier', request: ' Un site ' })).toBe(true);
    expect(isComparable({ id: 'plombier', request: 'Un site' }, { id: 'coach', request: 'Un site' })).toBe(false);
    expect(isComparable({ id: 'plombier', request: 'Un site' }, { id: 'plombier', request: 'Autre demande' })).toBe(false);
  });
});
