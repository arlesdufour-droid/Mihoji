import { expect, test } from '@playwright/test';
import { createOnboardingUser, fillMissingFields, previewFrame, waitForPreview } from './helpers';

// Lot 7, étape 1 (simulation, AI_MOCK=1) : les photos servent le contenu. Pour un coach : une photo par prestation, aucune galerie générique.
test('L7.1 un coach obtient une photo par prestation et aucune galerie posée sur la page', async ({ page, context }) => {
  test.setTimeout(180_000);
  await createOnboardingUser(context);
  await page.goto('/onboarding/manual');
  await page.getByLabel('Nom de votre entreprise').fill('Elan Coaching');
  await page.getByLabel('Votre métier ou activité').fill('Coach sportif');
  await page.getByLabel(/Adresse/).fill('14 quai des Chartrons, 33000 Bordeaux');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await fillMissingFields(page);
  await expect(page.getByRole('heading', { name: 'Décrivez le site que vous voulez' })).toBeVisible();
  await page.getByLabel('Votre demande').fill('Un site dynamique pour mon activité de coach sportif');
  await page.getByRole('button', { name: 'Créer mon site' }).click();

  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}\/preview$/, { timeout: 90_000 });
  await waitForPreview(page, (srcdoc) => srcdoc.startsWith('<!doctype html>') && srcdoc.includes('class="s s-services'), 'section des prestations');
  const frame = previewFrame(page);
  // Pas de galerie générique pour un praticien.
  await expect(frame.locator('.s-gallery')).toHaveCount(0);
  // Chaque prestation a sa photo (cartes à photo).
  const cards = frame.locator('.s-services .svc-item');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(2);
  await expect(frame.locator('.s-services .svc-item--photo img')).toHaveCount(count);
  // Chaque photo a une adresse et une description (accessibilité), pas un cadre vide.
  const described = await frame.locator('.s-services .svc-item--photo img').evaluateAll((images) => images.every((image) => (image as HTMLImageElement).getAttribute('src') && (image as HTMLImageElement).alt.length > 2));
  expect(described).toBe(true);
});
