import { expect, test } from '@playwright/test';
import { createOnboardingUser, fillMissingFields, previewFrame, previewSrcdoc, waitForPreview } from './helpers';

// Lot Q3 en simulation (AI_MOCK=1) : formulaires « Horaires » et « Chiffres clés » du Studio (sans passer par le chat), et aucun
// « Bientôt disponible » visible par les visiteurs. Pexels, les compositions par métier et le banc sont couverts par les tests unitaires
// et par l'exécution réelle du banc (qui coûte de l'argent, donc n'est pas un test automatisé).
test('Q3.1 les formulaires du Studio ajoutent les horaires et les chiffres clés au site, sans chat', async ({ page, context }) => {
  test.setTimeout(180_000);
  await createOnboardingUser(context);
  await page.goto('/onboarding/manual');
  await page.getByLabel('Nom de votre entreprise').fill('Boulangerie Lumière');
  await page.getByLabel('Votre métier ou activité').fill('Boulangerie');
  await page.getByLabel(/Adresse/).fill('8 rue du Port, 17000 La Rochelle');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await fillMissingFields(page);
  await page.getByLabel('Votre demande').fill('Un site chaleureux pour ma boulangerie');
  await page.getByRole('button', { name: 'Créer mon site' }).click();
  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}\/preview$/, { timeout: 90_000 });
  const projectId = page.url().match(/studio\/([0-9a-f-]{36})\//)![1];

  // Au départ : encarts « à compléter » pour les chiffres, et aucun « Bientôt disponible ».
  await waitForPreview(page, (html) => html.startsWith('<!doctype html>'), 'site créé');
  expect((await previewSrcdoc(page))!).not.toMatch(/bient(ô|o)t disponible/i);
  await expect(previewFrame(page).locator('[data-invite="stats"]')).toBeVisible();

  await page.getByRole('link', { name: 'Horaires et chiffres' }).click();
  await expect(page).toHaveURL(new RegExp(`/studio/${projectId}/infos$`));
  await expect(page.getByRole('heading', { name: 'Horaires et chiffres clés' })).toBeVisible();

  const hours = page.getByRole('form', { name: 'Horaires d’ouverture' });
  await hours.getByLabel('Lundi').fill('7 h – 19 h');
  await hours.getByLabel('Dimanche').fill('Fermé');
  await hours.getByLabel('Remarque (facultatif)').fill('Fermé les jours fériés');
  await hours.getByRole('button', { name: 'Enregistrer les horaires' }).click();
  await expect(hours.getByRole('status')).toContainText('Enregistré');

  // Un seul chiffre est refusé avec un message clair ; deux chiffres sont acceptés.
  const stats = page.getByRole('form', { name: 'Chiffres clés' });
  await stats.getByLabel('Chiffre 1').fill('350');
  await stats.getByLabel('Description 1').fill('chantiers réalisés');
  await stats.getByRole('button', { name: 'Enregistrer les chiffres clés' }).click();
  await expect(stats.getByRole('alert')).toContainText('au moins deux chiffres');
  await stats.getByLabel('Chiffre 2').fill('2008');
  await stats.getByLabel('Description 2').fill('année de création');
  await stats.getByRole('button', { name: 'Enregistrer les chiffres clés' }).click();
  await expect(stats.getByRole('status')).toContainText('Enregistré');

  await page.getByRole('link', { name: 'Aperçu' }).click();
  await waitForPreview(page, (html) => html.includes('class="s s-hours') && html.includes('class="s s-stats'), 'horaires et chiffres dans le site');
  await expect(previewFrame(page).locator('.s-hours')).toContainText('7 h – 19 h');
  await expect(previewFrame(page).locator('.s-hours')).toContainText('Fermé les jours fériés');
  await expect(previewFrame(page).locator('.s-stats')).toContainText('350');
  await expect(previewFrame(page).locator('[data-invite="stats"]')).toHaveCount(0);

  // Les valeurs sont retrouvées au rechargement du formulaire, et l'historique contient les deux versions.
  await page.goto(`/studio/${projectId}/infos`);
  await expect(page.getByRole('form', { name: 'Horaires d’ouverture' }).getByLabel('Lundi')).toHaveValue('7 h – 19 h');
  await expect(page.getByRole('form', { name: 'Chiffres clés' }).getByLabel('Chiffre 2')).toHaveValue('2008');
  const versions = await (await page.request.get(`/api/projects/${projectId}/versions`)).json() as { summary: string }[];
  expect(versions.map((version) => version.summary)).toEqual(expect.arrayContaining(['Horaires mis à jour', 'Chiffres clés mis à jour']));
});
