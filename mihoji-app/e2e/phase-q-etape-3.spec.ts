import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import { createOnboardingUser, fillMissingFields } from './helpers';

// Mission qualité, étape 3 (AI_MOCK=1) : questionnaire court de l'onboarding. Cinq réponses facultatives (principales prestations, fourchette de prix,
// horaires, zone d'intervention, ton souhaité) enregistrées avec l'entreprise ; sans réponse, rien n'est enregistré (rien n'est inventé).
async function toRequestStep(page: import('@playwright/test').Page, context: import('@playwright/test').BrowserContext, name: string) {
  await createOnboardingUser(context);
  await page.goto('/onboarding/manual');
  await page.getByLabel('Nom de votre entreprise').fill(name);
  await page.getByLabel('Votre métier ou activité').fill('Plombier chauffagiste');
  await page.getByLabel(/Adresse/).fill('3 rue des Lilas, 44000 Nantes');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await fillMissingFields(page);
  await expect(page.getByRole('heading', { name: 'Décrivez le site que vous voulez' })).toBeVisible();
}

test('E3.1 le questionnaire de l’onboarding enregistre les cinq réponses facultatives avec l’entreprise', async ({ page, context }) => {
  test.setTimeout(180_000);
  await toRequestStep(page, context, 'Lefèvre Plomberie');
  await page.getByLabel('Votre demande').fill('Un site sérieux pour mon entreprise de plomberie avec demande de devis');
  await page.getByLabel('Vos principales prestations').fill('dépannage, remplacement de chaudière');
  await page.getByLabel('Ce qui vous distingue').fill('intervention sous 2 heures');
  await page.getByLabel('Votre fourchette de prix').fill('diagnostic dès 89 €');
  await page.getByLabel('Vos horaires').fill('Lundi au vendredi, 8 h à 18 h');
  await page.getByLabel('Votre zone d’intervention').fill('Nantes et 30 km autour');
  await page.getByLabel('Le ton souhaité').selectOption('Chaleureux et familial');
  await page.getByRole('button', { name: 'Créer mon site' }).click();
  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}\/preview$/, { timeout: 90_000 });
  const projectId = page.url().match(/studio\/([0-9a-f-]{36})\//)![1];
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    const [row] = await sql<{ profile: Record<string, string> }[]>`select c.profile from companies c join projects p on p.workspace_id = c.workspace_id where p.id = ${projectId}`;
    expect(row.profile).toEqual({ specialties: 'dépannage, remplacement de chaudière', distinction: 'intervention sous 2 heures', priceRange: 'diagnostic dès 89 €', hours: 'Lundi au vendredi, 8 h à 18 h', area: 'Nantes et 30 km autour', tone: 'Chaleureux et familial' });
  } finally {
    await sql.end();
  }
  // Les réponses sont relisibles par l'API de profil (utilisées ensuite par les modifications et les créations suivantes).
  const profile = await (await page.request.get('/api/onboarding/profile')).json() as Record<string, string>;
  expect(profile.priceRange).toBe('diagnostic dès 89 €');
  expect(profile.area).toBe('Nantes et 30 km autour');
});

test('E3.2 sans aucune réponse, rien n’est enregistré : le site se crée quand même', async ({ page, context }) => {
  test.setTimeout(180_000);
  await toRequestStep(page, context, 'Quincaillerie Martin');
  await page.getByLabel('Votre demande').fill('Un site simple pour ma quincaillerie');
  await expect(page.getByLabel('Le ton souhaité')).toHaveValue('');
  await page.getByRole('button', { name: 'Créer mon site' }).click();
  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}\/preview$/, { timeout: 90_000 });
  const profile = await (await page.request.get('/api/onboarding/profile')).json() as Record<string, string>;
  expect(Object.values(profile).filter(Boolean)).toEqual([]);
  // Une réponse trop longue est refusée par l'API (jamais enregistrée).
  const refused = await page.request.post('/api/onboarding/profile', { data: { priceRange: 'x'.repeat(300) } });
  expect(refused.status()).toBe(400);
});
