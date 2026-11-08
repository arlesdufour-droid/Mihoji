import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import { createOnboardingUser, fillMissingFields, previewFrame, waitForPreview } from './helpers';

// Lot 7, étape 3 (AI_MOCK=1, emails simulés) : le devis envoyé depuis le site arrive vraiment, est stocké, notifié (simulation) et visible
// dans l'onglet « Demandes reçues ». Parcours du visiteur dans l'aperçu (envoi natif, sans JavaScript : le serveur répond par une page de remerciement), puis du commerçant dans le Studio.
test('L7.3 un devis envoyé depuis le site est reçu, stocké, notifié et listé dans « Demandes reçues »', async ({ page, context, request }) => {
  test.setTimeout(240_000);
  await createOnboardingUser(context);
  await page.goto('/onboarding/manual');
  await page.getByLabel('Nom de votre entreprise').fill('Lefèvre Plomberie');
  await page.getByLabel('Votre métier ou activité').fill('Plombier chauffagiste');
  await page.getByLabel(/Adresse/).fill('3 rue des Lilas, 44000 Nantes');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await fillMissingFields(page);
  await page.getByLabel('Votre demande').fill('Un site pour mon activité de plombier avec demande de devis en ligne');
  await page.getByRole('button', { name: 'Créer mon site' }).click();
  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}\/preview$/, { timeout: 90_000 });
  const projectId = page.url().match(/studio\/([0-9a-f-]{36})\//)![1];
  await waitForPreview(page, (srcdoc) => srcdoc.startsWith('<!doctype html>') && srcdoc.includes('data-lead="quote"'), 'formulaire de devis');

  // Le visiteur remplit le formulaire de devis dans l'aperçu : confirmation affichée sans quitter la page.
  const form = previewFrame(page).locator('form[data-lead="quote"]').first();
  await expect(form).toHaveCount(1);
  await form.getByLabel('Votre nom').fill('Marie Dupont');
  await form.getByLabel('Votre email').fill('marie.dupont@example.com');
  await form.getByLabel('Téléphone').fill('06 12 34 56 78');
  await form.locator('select[name="prestation"]').selectOption({ index: 1 });
  await form.getByLabel(/Décrivez/).fill('Fuite sous l’évier de la cuisine, intervention rapide souhaitée.');
  await form.getByRole('button', { name: 'Demander mon devis' }).click();
  await expect(previewFrame(page).getByRole('heading', { name: 'Merci !' })).toBeVisible();
  await expect(previewFrame(page).locator('body')).toContainText('Votre demande a bien été envoyée');

  // Stockage et notification (email simulé : aucun envoi réel).
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    const rows = await sql<{ name: string; email: string; phone: string; service: string; message: string; kind: string; status: string; notification: string }[]>`select name, email, phone, service, message, kind, status, notification from leads where project_id = ${projectId}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'Marie Dupont', email: 'marie.dupont@example.com', kind: 'quote', status: 'new', notification: 'simulated' });
    expect(rows[0].message).toContain('Fuite sous l’évier');
    expect(rows[0].service.length).toBeGreaterThan(0);

    // Un robot (champ piège rempli) reçoit un succès apparent mais rien n'est enregistré ; une demande invalide est refusée ; un site inconnu aussi.
    const base = { site: projectId, kind: 'contact', nom: 'Robot', email: 'bot@example.com', message: 'Achetez maintenant' };
    const bot = await request.post('/api/public/leads', { multipart: { ...base, website: 'http://spam.example' }, headers: { Accept: 'application/json' } });
    expect(bot.status()).toBe(201);
    const invalid = await request.post('/api/public/leads', { multipart: { ...base, email: 'pas-un-email' }, headers: { Accept: 'application/json' } });
    expect(invalid.status()).toBe(422);
    const unknown = await request.post('/api/public/leads', { multipart: { ...base, site: '00000000-0000-4000-8000-000000000000' }, headers: { Accept: 'application/json' } });
    expect(unknown.status()).toBe(404);
    expect(await sql`select 1 from leads where project_id = ${projectId}`).toHaveLength(1);
  } finally {
    await sql.end();
  }

  // Le commerçant retrouve la demande dans « Demandes reçues » et la marque comme traitée.
  await page.getByRole('link', { name: 'Demandes reçues' }).click();
  await expect(page).toHaveURL(new RegExp(`/studio/${projectId}/requests$`));
  const row = page.getByRole('table', { name: 'Demandes reçues' }).locator('tbody tr');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Marie Dupont');
  await expect(row).toContainText('marie.dupont@example.com');
  await expect(row).toContainText('Fuite sous l’évier');
  await row.getByRole('button', { name: /Marquer comme traitée/ }).click();
  await expect(row.getByRole('button', { name: /Remettre à traiter/ })).toContainText('Traitée');
});
