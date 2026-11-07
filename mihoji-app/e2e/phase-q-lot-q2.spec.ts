import { expect, test, type Page } from '@playwright/test';
import postgres from 'postgres';
import { createOnboardingUser, fillMissingFields, previewFrame, previewSrcdoc, waitForPreview } from './helpers';

// Lot Q2 en simulation (AI_MOCK=1) : questions courtes de l'onboarding, photos de l'utilisateur prioritaires, emplacements « à compléter »
// visibles seulement dans le Studio. La qualité des textes, des photos et des styles est mesurée par le banc d'essai (vraie IA), pas ici.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const photo = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG });

async function onboardUntilRequest(page: Page, context: Parameters<typeof createOnboardingUser>[0]) {
  await createOnboardingUser(context);
  await page.goto('/onboarding/manual');
  await page.getByLabel('Nom de votre entreprise').fill('Boulangerie Lumière');
  await page.getByLabel('Votre métier ou activité').fill('Boulangerie');
  await page.getByLabel(/Adresse/).fill('8 rue du Port, 17000 La Rochelle');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await fillMissingFields(page);
  await expect(page.getByRole('heading', { name: 'Décrivez le site que vous voulez' })).toBeVisible();
}

test('Q2.1 questions courtes, photos de l’utilisateur prioritaires, emplacements « à compléter » visibles seulement dans le Studio', async ({ page, context }) => {
  test.setTimeout(180_000);
  await onboardUntilRequest(page, context);

  // Trois questions courtes : spécialités, ce qui distingue, photos.
  await page.getByLabel('Vos spécialités').fill('pain au levain, viennoiseries');
  await page.getByLabel('Ce qui vous distingue').fill('farines locales, fabrication sur place');
  await page.getByLabel('Mon logo').setInputFiles(photo('logo.png'));
  await page.getByLabel('Ma boutique ou mon atelier').setInputFiles(photo('boutique.png'));
  await page.getByLabel('Mes réalisations').setInputFiles([photo('a.png'), photo('b.png'), photo('c.png')]);
  await expect(page.getByRole('list', { name: 'Photos envoyées' }).locator('li')).toHaveCount(5);
  await page.getByLabel('Votre demande').fill('Un site chaleureux pour ma boulangerie');
  await page.getByRole('button', { name: 'Créer mon site' }).click();

  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}\/preview$/, { timeout: 90_000 });
  const projectId = page.url().match(/studio\/([0-9a-f-]{36})\//)![1];
  await waitForPreview(page, (srcdoc) => srcdoc.startsWith('<!doctype html>') && srcdoc.includes('/api/site-photos/'), 'photos de l’utilisateur dans le site');
  const srcdoc = (await previewSrcdoc(page))!;

  // Le logo est dans l'en-tête, la boutique en photo d'en-tête et les réalisations dans la galerie (aucun crédit Unsplash sur ces photos).
  await expect(previewFrame(page).locator('.site-header .brand img')).toHaveCount(1);
  await expect(previewFrame(page).locator('.s-hero img[src^="/api/site-photos/"]')).toHaveCount(1);
  expect(await previewFrame(page).locator('#gallery img[src^="/api/site-photos/"]').count()).toBeGreaterThanOrEqual(3);
  // Pas d'avis ni de chiffres inventés : un emplacement visible seulement dans le Studio invite à les ajouter.
  expect(srcdoc).not.toContain('class="s s-testimonials');
  expect(srcdoc).not.toContain('class="s s-stats');
  await expect(previewFrame(page).locator('[data-invite="testimonials"]')).toContainText('Avis de vos clients');
  await expect(previewFrame(page).locator('[data-invite="stats"]')).toContainText('Chiffres clés');

  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    const [row] = await sql<{ profile: Record<string, string> }[]>`select c.profile from companies c join projects p on p.workspace_id = c.workspace_id where p.id = ${projectId}`;
    expect(row.profile).toEqual({ specialties: 'pain au levain, viennoiseries', distinction: 'farines locales, fabrication sur place' });
    const [photos] = await sql<{ n: number }[]>`select count(*)::int as n from site_photos s join projects p on p.workspace_id = s.workspace_id where p.id = ${projectId}`;
    expect(photos.n).toBe(5);
  } finally {
    await sql.end();
  }

  // Onglet « Mes photos » : supprimer le logo puis mettre le site à jour retire le logo de l'en-tête.
  await page.getByRole('link', { name: 'Mes photos' }).click();
  await expect(page).toHaveURL(new RegExp(`/studio/${projectId}/photos$`));
  await expect(page.getByRole('list', { name: 'Vos photos' }).locator('li')).toHaveCount(5);
  await page.getByRole('button', { name: /Supprimer la photo : Logo/ }).click();
  await expect(page.getByRole('list', { name: 'Vos photos' }).locator('li')).toHaveCount(4);
  await page.getByRole('button', { name: 'Utiliser mes photos dans le site' }).click();
  await expect(page.getByRole('status')).toContainText('Le site utilise maintenant vos photos');
  await page.getByRole('link', { name: 'Aperçu' }).click();
  await waitForPreview(page, (html) => html.startsWith('<!doctype html>') && !html.includes('class="brand-wrap"'), 'logo retiré après suppression');
  expect(await previewFrame(page).locator('#gallery img[src^="/api/site-photos/"]').count()).toBeGreaterThanOrEqual(3);
  const versions = await (await page.request.get(`/api/projects/${projectId}/versions`)).json() as { summary: string }[];
  expect(versions.map((version) => version.summary)).toContain('Photos de l’entreprise ajoutées');
});

test('Q2.2 l’onglet « Mes photos » refuse un fichier qui n’est pas une image et affiche une erreur claire', async ({ page, context }) => {
  test.setTimeout(180_000);
  await onboardUntilRequest(page, context);
  await page.getByLabel('Votre demande').fill('Un site chaleureux pour ma boulangerie');
  await page.getByRole('button', { name: 'Créer mon site' }).click();
  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}\/preview$/, { timeout: 90_000 });
  const projectId = page.url().match(/studio\/([0-9a-f-]{36})\//)![1];
  await page.goto(`/studio/${projectId}/photos`);
  await expect(page.getByRole('heading', { name: 'Mes photos' })).toBeVisible();
  await expect(page.getByText('Aucune photo pour le moment.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Utiliser mes photos dans le site' })).toBeDisabled();
  await page.getByLabel(/Choisir des images/).setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('pas une image') });
  await expect(page.locator('p[role=alert]')).toContainText('Format non accepté');
  await page.getByLabel(/Choisir des images/).setInputFiles({ name: 'faux.png', mimeType: 'image/png', buffer: Buffer.from('ce n’est pas un vrai PNG') });
  await expect(page.locator('p[role=alert]')).toContainText('illisible');
});
