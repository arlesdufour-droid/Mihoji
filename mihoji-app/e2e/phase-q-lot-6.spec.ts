import { expect, test } from '@playwright/test';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { authCookies } from './helpers';

// Lot 6 (sans IA, sans coût) : la galerie /admin/benchmark lit des exécutions du banc d'essai, les compare et enregistre les notes manuelles.
// Deux exécutions de test (identifiants « zz-e2e-… ») sont créées puis supprimées ; les vraies exécutions ne sont pas touchées.
const BASE = resolve('docs/benchmark');
const PREVIOUS = 'zz-e2e-a';
const CURRENT = 'zz-e2e-b';
const SHOT = resolve('docs/screenshots/phase-q-lot5/ecran-demande.jpg');

function generation(id: string, costEur: number) {
  return { id, costEur, attempts: 1, durationMs: 21_000, promptTokens: 300, completionTokens: 3_000, cacheReadTokens: 0, cacheWriteTokens: 0, model: 'claude-sonnet-5-5' };
}
const note = (value: number) => ({ note: value, raison: `Raison ${value}.` });
function site(id: string, mean: number, costEur: number) {
  return {
    id, label: `Site ${id}`, request: `Demande ${id}`, status: 'succeeded', generation: generation(`g-${id}`, costEur),
    style: 'artisan', palette: 'terracotta', sections: ['hero', 'about', 'footer'], modules: ['shop'],
    photos: { requested: 6, fromCache: 0, unsplashCalls: 0, fromLocal: 4, unresolved: ['a', 'b'] },
    checks: { desktop: { overflow: 0, contrastFailures: 0, imagesWithoutAlt: 0, h1Count: 1 }, mobile: { overflow: 0, contrastFailures: 0, imagesWithoutAlt: 0, h1Count: 1 }, filler: [], brokenImages: 0 },
    lighthouse: { mobile: { performance: 91, accessibility: 97, seo: 100, bestPractices: 96 }, desktop: { performance: 100, accessibility: 97, seo: 100, bestPractices: 100 } },
    judge: { scores: { texte: note(4), distinctif: note(2), hierarchie: note(3), photos: note(1), credibilite: note(5) }, mean, costEur: 0.01, promptTokens: 3_000, completionTokens: 500 },
  };
}
function run(runId: string, mean: number, costEur: number) {
  const sites = [site('alpha', mean, costEur), site('beta', mean, costEur)];
  return {
    benchmarkVersion: 1, rubricVersion: 1, runId, startedAt: '2026-11-06T10:00:00.000Z', photos: 'local', provider: 'anthropic', model: 'claude-sonnet-5-5', effort: 'medium', promptHash: 'abc123def456',
    totals: { sites: 2, succeeded: 2, generationCostEur: costEur * 2, judgeCostEur: 0.02, totalCostEur: costEur * 2 + 0.02, averageGenerationCostEur: costEur, durationMs: 42_000, judgeMean: mean },
    uniformity: { styles: { artisan: 2 }, palettes: { 'artisan/terracotta': 2 }, sameSequenceGroups: [{ sequence: ['hero', 'about', 'footer'], ids: ['alpha', 'beta'] }], sitesInSameSequenceGroup: 2, distinctSequences: 1 },
    sites,
  };
}
function seed(runId: string, mean: number, costEur: number) {
  const dir = resolve(BASE, runId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'results.json'), JSON.stringify(run(runId, mean, costEur)));
  for (const id of ['alpha', 'beta']) for (const kind of ['ordinateur', 'mobile']) copyFileSync(SHOT, resolve(dir, `${id}-${kind}.jpg`));
  writeFileSync(resolve(dir, 'alpha.html'), '<!doctype html><title>x</title>');
}

test.beforeAll(() => { seed(PREVIOUS, 2.8, 0.03); seed(CURRENT, 3.2, 0.04); });
test.afterAll(() => { for (const id of [PREVIOUS, CURRENT]) rmSync(resolve(BASE, id), { recursive: true, force: true }); });

test('Q6.1 la galerie et ses fichiers sont réservés aux administrateurs', async ({ page, request }) => {
  await page.goto(`/admin/benchmark?run=${CURRENT}`);
  await expect(page).toHaveURL(/\/$/);
  // Sans session : refus (401 ou 403 selon que la requête est arrêtée avant ou après la vérification d'administrateur).
  expect([401, 403]).toContain((await request.get(`/admin/benchmark/file?run=${CURRENT}&name=alpha-mobile.jpg`)).status());
  expect([401, 403]).toContain((await request.post('/api/admin/benchmark/rating', { data: { runId: CURRENT, siteId: 'alpha', rating: 3 } })).status());
  expect(existsSync(resolve(BASE, CURRENT, 'manual.json'))).toBe(false);
});

test('Q6.2 la galerie affiche l’exécution, ses notes, ses coûts et la comparaison avec la précédente', async ({ page, context }) => {
  await context.addCookies(authCookies());
  await page.goto(`/admin/benchmark?run=${CURRENT}`);
  await expect(page.getByRole('heading', { name: 'Banc d’essai de qualité' })).toBeVisible();
  await expect(page.getByTestId('benchmark-photos')).toContainText('bibliothèque locale');
  await expect(page.getByTestId('benchmark-cost')).toContainText('génération 0,080 €');
  await expect(page.getByTestId('benchmark-means')).toContainText('3.2/5');
  await expect(page.getByTestId('benchmark-uniformity')).toContainText('2 sites sur 2 partagent');
  await expect(page.getByTestId('benchmark-comparison')).toContainText(`Comparaison avec ${PREVIOUS}`);
  await expect(page.getByTestId('benchmark-comparison')).toContainText('2.8 → 3.2 (+0.40)');
  const alpha = page.getByTestId('site-alpha');
  await expect(alpha).toContainText('Demande alpha');
  await expect(page.getByTestId('judge-alpha')).toContainText('Juge IA : 3.2/5 (+0.40 vs zz-e2e-a)');
  await expect(page.getByTestId('judge-alpha')).toContainText('Crédibilité : 5/5');
  await expect(page.getByTestId('checks-alpha')).toContainText('Contrôles du rendu (pas des indicateurs de qualité)');
  await expect(page.getByTestId('checks-alpha')).toContainText('Lighthouse mobile : performance 91');
  const capture = alpha.getByRole('img', { name: 'Capture ordinateur : Site alpha' });
  await expect.poll(() => capture.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
});

test('Q6.3 la note manuelle est enregistrée avec l’exécution et retrouvée au rechargement', async ({ page, context }) => {
  await context.addCookies(authCookies());
  await page.goto(`/admin/benchmark?run=${CURRENT}`);
  const rating = page.getByTestId('manual-alpha');
  await expect(rating).toContainText('Pas encore notée');
  await rating.getByRole('button', { name: 'Note 4 sur 5' }).click();
  await expect(rating).toContainText('Votre note : 4/5');
  expect(JSON.parse(readFileSync(resolve(BASE, CURRENT, 'manual.json'), 'utf8'))).toEqual({ alpha: 4 });
  await page.reload();
  await expect(page.getByTestId('manual-alpha').getByRole('button', { name: 'Note 4 sur 5' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('benchmark-means')).toContainText('4.00/5 (1 site)');
  // Un second clic sur la même note l'efface.
  await page.getByTestId('manual-alpha').getByRole('button', { name: 'Note 4 sur 5' }).click();
  await expect(page.getByTestId('manual-alpha')).toContainText('Pas encore notée');
  expect(JSON.parse(readFileSync(resolve(BASE, CURRENT, 'manual.json'), 'utf8'))).toEqual({});
});
