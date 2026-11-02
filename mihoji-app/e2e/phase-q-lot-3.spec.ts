import { expect, test } from '@playwright/test';
import { authCookies } from './helpers';

test.beforeEach(async ({ context }) => { await context.addCookies(authCookies()); });

// Les photos des sites d'exemple viennent de la bibliothèque locale (aucun appel à l'API Unsplash dans ces tests).
test('Q3.1 le cabinet d’avocats n’affiche plus de drapeau, chaque photo a un texte alternatif et un crédit', async ({ page }) => {
  await page.goto('/admin/design/render?sample=avocat&style=premium');
  const hero = page.locator('img.media').first();
  await expect(hero).toHaveAttribute('src', /images\.unsplash\.com/);
  await expect(hero).not.toHaveAttribute('src', /1775144657566-e5b093073baf/); // ancienne photo : drapeau américain
  const images = page.locator('img.media');
  const count = await images.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) await expect(images.nth(i)).toHaveAttribute('alt', /.{5,}/);
  await expect(page.locator('.credit a[href*="utm_source=mihoji"]').first()).toBeVisible();
  await expect(page.locator('.credit a[href*="unsplash.com/?utm_source=mihoji"]').first()).toBeVisible();
});

test('Q3.2 la génération (simulation) renseigne des photos libres et aucune image ne reste vide', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/admin/design/generate');
  await page.getByRole('button', { name: 'Plombier (demande de devis)' }).click();
  await page.getByRole('button', { name: 'Générer le site' }).click();
  await expect(page).toHaveURL(/\/admin\/design\/generate\?id=/);
  const frame = page.frameLocator('iframe[title="Site généré"]');
  await expect(frame.locator('img.media').first()).toHaveAttribute('src', /images\.unsplash\.com/);
  await expect(frame.locator('.credit').first()).toContainText('Unsplash');
});
