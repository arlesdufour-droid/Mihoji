import { expect, test } from '@playwright/test';
import { authCookies, readState } from './helpers';

const state = readState();
const SIRET = '55210055400013';

test('1.1 la page d’accueil TPE : titre, SIRET central, garanties, exemples, 3 étapes, sans jargon', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Artisans, commerçants, indépendants : le site de votre entreprise, en ligne en 10 minutes.');
  await expect(page.getByText('Conforme à la loi française. Sans connaissances techniques.')).toBeVisible();
  await expect(page.getByPlaceholder('Votre numéro SIRET (14 chiffres)')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Créer mon site' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Pas encore de SIRET ? Décrivez votre activité' })).toBeVisible();
  for (const guarantee of ['Mentions légales et RGPD inclus', 'Hébergé en France', 'Sans engagement']) await expect(page.getByText(guarantee, { exact: false }).first()).toBeVisible();
  for (const label of ['Plombier', 'Boulangerie', 'Kinésithérapeute', 'Consultant']) await expect(page.getByRole('link', { name: new RegExp(label) })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Comment ça marche' })).toBeVisible();
  await expect(page.locator('ol > li')).toHaveCount(3);
  expect(await page.locator('body').innerText()).not.toMatch(/\b(IA|prompt|crédits?)\b/i);
  await expect(page.getByRole('link', { name: 'TPE & indépendants' })).toHaveAttribute('aria-current', 'page');
});

test('1.2 le sélecteur de public mène à /pro, avec son titre, ses boutons, la capture clients et 4 atouts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Agences & freelances' }).click();
  await expect(page).toHaveURL(/\/pro$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Agences web et freelances : livrez des sites conformes à vos clients en une heure, sous votre marque.');
  await expect(page.getByRole('link', { name: 'Créer mon espace agence' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voir une démo' })).toBeVisible();
  await expect(page.getByLabel('Aperçu du tableau de bord clients')).toBeVisible();
  for (const asset of ['Marque blanche', 'Code exportable', 'Transfert au client', 'Conformité automatique']) await expect(page.getByText(asset, { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Agences & freelances' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: 'TPE & indépendants' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('1.3 un SIRET invalide est refusé ; un SIRET valide mène à la connexion en gardant l’intention', async ({ page, context }) => {
  await page.goto('/');
  await page.getByPlaceholder('Votre numéro SIRET (14 chiffres)').fill('1234');
  await page.getByRole('button', { name: 'Créer mon site' }).click();
  await expect(page.getByText('Un numéro SIRET comporte 14 chiffres.')).toBeVisible();
  await page.getByPlaceholder('Votre numéro SIRET (14 chiffres)').fill('552 100 554 00013');
  await page.getByRole('button', { name: 'Créer mon site' }).click();
  await expect(page).toHaveURL(new RegExp(`/login\\?intent=business&siret=${SIRET}$`));
  await expect(page.getByText('Connectez-vous pour créer le site de votre entreprise.')).toBeVisible();
  await expect.poll(async () => (await context.cookies()).find((cookie) => cookie.name === 'mihoji_intent')?.value ?? '').toContain(SIRET);
});

test('1.4 un visiteur arrivé par /pro et déjà connecté va directement dans l’espace agence', async ({ page, context }) => {
  await context.addCookies(authCookies());
  await page.goto('/pro');
  await page.getByRole('link', { name: 'Créer mon espace agence' }).click();
  await expect(page).toHaveURL(/\/agency$/);
  await expect(page.getByRole('heading', { name: 'Mes clients' })).toBeVisible();
  await expect(page.getByText('Projet E2E', { exact: true })).toBeVisible();
  await expect(page.getByText('Vous créez un site pour…')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Créer le site d’un client' })).toBeVisible();
});

test('1.5 un visiteur connecté qui saisit son SIRET arrive sur son projet, et la page SIRET est préremplie', async ({ page, context }) => {
  await context.addCookies(authCookies());
  await page.goto('/');
  await page.getByPlaceholder('Votre numéro SIRET (14 chiffres)').fill(SIRET);
  await page.getByRole('button', { name: 'Créer mon site' }).click();
  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]+\/preview$/);
  await page.goto(`/onboarding/siret?siret=${SIRET}`);
  await expect(page.locator('#siret')).toHaveValue(SIRET);
});

test('1.6 un exemple métier est cliquable et mène à un vrai site d’exemple', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Plombier/ }).click();
  await expect(page).toHaveURL(/\/exemples\/plombier$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Exemple : plombier');
  await expect(page.frameLocator('iframe[title="Exemple de site : Plombier"]').getByRole('heading', { level: 1 })).toHaveText('Dupont Plomberie');
  await expect(page.getByRole('link', { name: 'Créer un site comme celui-ci' })).toHaveAttribute('href', '/login?intent=business');
  expect((await page.goto('/exemples/inconnu'))?.status()).toBe(404);
});

test('1.7 aucune erreur d’hydratation sur l’accueil et /pro', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error' && /hydrat|did not match|Minified React error/i.test(message.text())) errors.push(message.text()); });
  for (const path of ['/', '/pro', '/exemples/boulangerie']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('1.8 /agency exige d’être connecté', async ({ page }) => {
  await page.goto('/agency');
  await expect(page).toHaveURL(/\/login/);
  expect(state.projectId).toBeTruthy();
});
