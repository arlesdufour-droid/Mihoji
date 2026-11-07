import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import { createOnboardingUser, fillMissingFields, previewFrame, previewSrcdoc, waitForPreview } from './helpers';

// Lot 5 en simulation (AI_MOCK=1) : l'écran « Décrivez le site que vous voulez » crée un site au nouveau format.
// Le parcours complet SIRET → demande → Studio avec la vraie IA est dans phase-q-lot-5-real.spec.ts.

test('Q5.1 saisie manuelle → demande → Studio : le site créé est au nouveau format, avec le style choisi', async ({ page, context }) => {
  test.setTimeout(120_000);
  const { email } = await createOnboardingUser(context);
  await page.goto('/onboarding/manual');
  await page.getByLabel('Nom de votre entreprise').fill('Atelier Dupont');
  await page.getByLabel('Votre métier ou activité').fill('Plomberie et chauffage');
  await page.getByLabel(/Adresse/).fill('12 rue des Lilas, 17000 La Rochelle');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await fillMissingFields(page);

  await expect(page.getByRole('heading', { name: 'Décrivez le site que vous voulez' })).toBeVisible();
  const create = page.getByRole('button', { name: 'Créer mon site' });
  await expect(create).toBeDisabled();
  await page.getByLabel('Votre demande').fill('court');
  await expect(create).toBeDisabled();
  // Les trois exemples remplissent le champ.
  const examples = ['Je veux un site chaleureux avec prise de commande en ligne', 'Un site sobre et professionnel pour recevoir des demandes de devis'];
  for (const example of examples) {
    await page.getByRole('button', { name: example }).click();
    await expect(page.getByLabel('Votre demande')).toHaveValue(example);
  }
  await expect(page.locator('button[aria-pressed]')).toHaveCount(9);
  await page.getByRole('button', { name: 'Élégant premium' }).click();
  await expect(page.getByRole('button', { name: 'Élégant premium' })).toHaveAttribute('aria-pressed', 'true');
  await expect(create).toBeEnabled();
  await create.click();

  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}\/preview$/, { timeout: 90_000 });
  const projectId = page.url().match(/studio\/([0-9a-f-]{36})\//)![1];
  await waitForPreview(page, (srcdoc) => srcdoc.startsWith('<!doctype html>') && srcdoc.includes('data-style="premium"'), 'site structuré au style choisi');
  await expect(previewFrame(page).locator('.brand').first()).toHaveText('Atelier Dupont');
  const srcdoc = (await previewSrcdoc(page))!;
  expect(srcdoc).not.toContain('{{company.');
  expect(srcdoc).not.toContain('<script');

  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    const files = await sql<{ path: string }[]>`select path from project_files where project_id = ${projectId}`;
    expect(files.map((file) => file.path)).toContain('site.json');
    const generations = await sql<{ task: string; status: string; project_id: string; provider: string }[]>`select task, status, project_id, provider from site_generations where project_id = ${projectId}`;
    expect(generations).toEqual([expect.objectContaining({ task: 'create', status: 'succeeded', provider: 'mock' })]);
    const [chat] = await sql<{ n: number }[]>`select count(*)::int as n from chat_messages where project_id = ${projectId}`;
    expect(chat.n).toBe(2);
    const [company] = await sql<{ siret: string | null; name: string }[]>`select c.siret, c.name from companies c join users u on true join workspace_members m on m.user_id = u.id and m.workspace_id = c.workspace_id where u.email = ${email}`;
    expect(company).toMatchObject({ siret: null, name: 'Atelier Dupont' });
  } finally {
    await sql.end();
  }
});

test('Q5.2 sans fiche entreprise, l’écran de demande renvoie à la première étape', async ({ page, context }) => {
  await createOnboardingUser(context);
  await page.goto('/onboarding/request');
  await expect(page).toHaveURL(/\/onboarding\/siret$/);
});
