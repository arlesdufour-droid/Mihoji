import { expect, test } from '@playwright/test';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { authCookies } from './helpers';

// Page d'administration /admin/vitrine (sans IA, sans coût) : les sites d'exemple enregistrés dans le dépôt, côte à côte en version ordinateur et mobile,
// avec une case « garder » par site. Pendant les tests, les choix sont écrits dans un fichier temporaire (VITRINE_KEEP_FILE) : le vrai choix de src/content/vitrine/keep.json n'est jamais touché.
const DIR = resolve('src/content/vitrine');
const KEEP = resolve('.next-e2e/vitrine-keep.json');
const slugs = readdirSync(DIR).filter((name) => name.endsWith('.json') && name !== 'keep.json').map((name) => name.replace(/\.json$/, ''));

test.beforeAll(() => { rmSync(KEEP, { force: true }); });
test.afterAll(() => { rmSync(KEEP, { force: true }); });

test('VT.1 la page, ses aperçus et l’enregistrement des choix sont réservés aux administrateurs', async ({ page, request }) => {
  test.setTimeout(150_000);
  expect(slugs.length).toBeGreaterThanOrEqual(6);
  await page.goto('/admin/vitrine');
  await expect(page).toHaveURL(/\/$/);
  expect([401, 403]).toContain((await request.get(`/admin/vitrine/preview/${slugs[0]}`)).status());
  expect([401, 403]).toContain((await request.post('/api/admin/vitrine/keep', { data: { slug: slugs[0], keep: true } })).status());
});

test('VT.2 les sites d’exemple s’affichent côte à côte (ordinateur et mobile), avec la mention « entreprise fictive », et la case « garder » est enregistrée', async ({ page, context }) => {
  test.setTimeout(120_000);
  await context.addCookies(authCookies());
  await page.goto('/admin/vitrine');
  await expect(page.getByRole('heading', { name: 'Vitrine de la page d’accueil' })).toBeVisible();
  await expect(page.getByTestId('vitrine-summary')).toContainText(`${slugs.length} sites sur 8`);
  for (const slug of slugs) {
    const card = page.getByTestId(`vitrine-${slug}`);
    await expect(card).toContainText('entreprise fictive');
    await expect(card.locator('iframe')).toHaveCount(2); // ordinateur et mobile
    await expect(card.getByRole('checkbox', { name: /^Garder/ })).toBeVisible();
  }

  // Un aperçu est le vrai site rendu par le moteur actuel : mention visible, en-tête, formulaires du module, aucune image cassée, aucun script.
  const slug = slugs[0];
  const card = page.getByTestId(`vitrine-${slug}`);
  await card.scrollIntoViewIfNeeded();
  const desktop = page.frameLocator(`iframe[title^="Aperçu ordinateur"][src$="/${slug}"]`);
  await expect(desktop.locator('.demo-notice')).toContainText('Entreprise fictive');
  await expect(desktop.locator('.site-header')).toBeVisible();
  await expect(desktop.locator('form').first()).toBeVisible();
  const response = await page.request.get(`/admin/vitrine/preview/${slug}`);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).not.toContain('<script');
  expect(html).toContain('Entreprise fictive');
  const sources = [...html.matchAll(/src="(\/vitrine\/[^"]+)"/g)].map((match) => match[1]);
  for (const src of sources.slice(0, 4)) expect((await page.request.get(src)).status(), src).toBe(200);

  // « Garder » : enregistré tout de suite dans le dépôt, retrouvé au rechargement.
  const checkbox = card.getByRole('checkbox', { name: /^Garder/ });
  const wasChecked = await checkbox.isChecked();
  await checkbox.setChecked(!wasChecked);
  await expect.poll(() => JSON.parse(existsSync(KEEP) ? readFileSync(KEEP, 'utf8') : '{}')[slug]).toBe(!wasChecked);
  await page.reload();
  await expect(page.getByTestId(`vitrine-${slug}`).getByRole('checkbox', { name: /^Garder/ })).toBeChecked({ checked: !wasChecked });
  await expect(page.getByTestId('vitrine-summary')).toContainText(wasChecked ? '0 gardé' : '1 gardé');
});
