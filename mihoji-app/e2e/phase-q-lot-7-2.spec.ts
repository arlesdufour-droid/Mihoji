import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import { createOnboardingUser, fillMissingFields, lastAssistantMessage, sendChat, waitForPreview } from './helpers';

// Lot 7, étape 2 (CONNECTORS_MOCK=1, AI_MOCK=1) : écran « Connexions » — brancher, voir l'état, déconnecter, et l'assistant qui propose de brancher un outil.
test('L7.2 connecter et déconnecter Brevo, jeton chiffré, et l’assistant propose de brancher Stripe pour un acompte', async ({ page, context }) => {
  test.setTimeout(240_000);
  await createOnboardingUser(context);
  await page.goto('/onboarding/manual');
  await page.getByLabel('Nom de votre entreprise').fill('Elan Coaching');
  await page.getByLabel('Votre métier ou activité').fill('Coach sportif');
  await page.getByLabel(/Adresse/).fill('14 quai des Chartrons, 33000 Bordeaux');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await fillMissingFields(page);
  await page.getByLabel('Votre demande').fill('Un site dynamique pour mon activité de coach sportif');
  await page.getByRole('button', { name: 'Créer mon site' }).click();
  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}\/preview$/, { timeout: 90_000 });
  await waitForPreview(page, (srcdoc) => srcdoc.startsWith('<!doctype html>'), 'site créé');
  const projectId = page.url().match(/studio\/([0-9a-f-]{36})\//)![1];

  // Onglet « Connexions » : Brevo connectable, les autres outils désactivés avec « Bientôt disponible ».
  await page.getByRole('link', { name: 'Connexions' }).click();
  await expect(page).toHaveURL(new RegExp(`/studio/${projectId}/connections$`));
  const brevo = page.locator('[data-connector="brevo"]');
  await expect(brevo).toContainText('Ce que l’assistant pourra faire');
  await expect(page.locator('[data-connector="google-calendar"]').getByRole('button', { name: 'Bientôt disponible' })).toBeDisabled();

  // Une clé refusée par le service n'est pas enregistrée.
  await brevo.getByRole('button', { name: 'Connecter Brevo' }).click();
  await brevo.getByLabel('Clé d’API Brevo').fill('mauvaise-cle-123');
  await brevo.getByRole('button', { name: 'Enregistrer la connexion' }).click();
  await expect(brevo.getByRole('status')).toContainText('n’est pas reconnue');

  // Une bonne clé : connecté, et la clé n'est jamais lisible ni côté navigateur ni en base.
  await brevo.getByLabel('Clé d’API Brevo').fill('test-brevo-cle-secrete-123');
  await brevo.getByRole('button', { name: 'Enregistrer la connexion' }).click();
  await expect(brevo.getByRole('status')).toContainText('Brevo est connecté');
  await expect(brevo.getByRole('button', { name: 'Déconnecter Brevo' })).toBeVisible();
  const listed = await (await page.request.get('/api/connections')).text();
  expect(listed).not.toContain('cle-secrete');
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    const rows = await sql<{ credentials: string; scopes: string[] }[]>`select c.credentials, c.scopes from connections c join projects p on p.workspace_id = c.workspace_id where p.id = ${projectId} and c.provider = 'brevo'`;
    expect(rows).toHaveLength(1);
    expect(rows[0].credentials).toMatch(/^v1\./);
    expect(rows[0].credentials).not.toContain('cle-secrete');
    expect(rows[0].scopes).toEqual(['email.notify', 'email.newsletter']);

    // Rechargement : la connexion est mémorisée côté serveur.
    await page.reload();
    await expect(page.locator('[data-connector="brevo"]').getByRole('button', { name: 'Déconnecter Brevo' })).toBeVisible();

    // L'assistant propose de brancher l'outil manquant quand la demande en suppose un (Stripe : bientôt disponible).
    await page.getByRole('link', { name: 'Aperçu' }).click();
    await sendChat(page, 'Ajoute la prise de rendez-vous avec acompte');
    await expect(lastAssistantMessage(page)).toContainText('Connexions', { timeout: 60_000 });
    await expect(lastAssistantMessage(page)).toContainText('Stripe');

    // Déconnexion à tout moment : le jeton chiffré est supprimé.
    await page.getByRole('link', { name: 'Connexions' }).click();
    await page.locator('[data-connector="brevo"]').getByRole('button', { name: 'Déconnecter Brevo' }).click();
    await expect(page.locator('[data-connector="brevo"]').getByRole('status')).toContainText('déconnecté');
    const after = await sql`select 1 from connections c join projects p on p.workspace_id = c.workspace_id where p.id = ${projectId}`;
    expect(after).toHaveLength(0);
  } finally {
    await sql.end();
  }
});
