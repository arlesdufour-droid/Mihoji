import { expect, test, type FrameLocator } from '@playwright/test';
import postgres from 'postgres';
import { parisInstant } from '../src/lib/bookings/slots';
import { createOnboardingUser, fillMissingFields, previewFrame, waitForPreview } from './helpers';

// Lot 7, étape 4 (AI_MOCK=1, Stripe SIMULÉ : STRIPE_SECRET_KEY vide) : rendez-vous avec acompte payé directement sur le compte connecté du commerçant.
// Le test réel avec les cartes de test officielles de Stripe exige une clé sk_test_… (voir docs/phase-q-progress.md).
function nextWeekday(minDaysAhead: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + minDaysAhead);
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function fillBooking(frame: FrameLocator, date: string, name: string) {
  const form = frame.locator('form[action$="/api/public/bookings"]');
  await form.locator('select[name="service"]').selectOption('Diagnostic chaudière');
  await form.locator('input[name="date"]').fill(date);
  await form.locator('select[name="time"]').selectOption('10:00');
  await form.locator('input[name="nom"]').fill(name);
  await form.locator('input[name="email"]').fill('client@example.com');
  await form.locator('input[name="telephone"]').fill('06 12 34 56 78');
  await form.getByRole('button', { name: 'Réserver et payer l’acompte' }).click();
}

test('L7.4 rendez-vous avec acompte : Stripe connecté, carte refusée puis acceptée, créneau pris, annulation avec remboursement', async ({ page, context, request }) => {
  test.setTimeout(300_000);
  await createOnboardingUser(context);
  await page.goto('/onboarding/manual');
  await page.getByLabel('Nom de votre entreprise').fill('Lefèvre Plomberie');
  await page.getByLabel('Votre métier ou activité').fill('Plombier chauffagiste');
  await page.getByLabel(/Adresse/).fill('3 rue des Lilas, 44000 Nantes');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await fillMissingFields(page);
  await page.getByLabel('Votre demande').fill('Un site de plombier avec prise de rendez-vous et acompte en ligne');
  await page.getByRole('button', { name: 'Créer mon site' }).click();
  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}\/preview$/, { timeout: 90_000 });
  const projectId = page.url().match(/studio\/([0-9a-f-]{36})\//)![1];
  await waitForPreview(page, (srcdoc) => srcdoc.includes('action="/api/public/bookings"'), 'formulaire de rendez-vous');
  const date = nextWeekday(3);

  // Sans Stripe branché, un rendez-vous avec acompte est refusé clairement.
  await fillBooking(previewFrame(page), date, 'Sans Stripe');
  await expect(previewFrame(page).locator('body')).toContainText('paiement en ligne n’est pas encore disponible', { timeout: 60_000 });

  // Le commerçant branche Stripe (compte connecté simulé).
  await page.goto(`/studio/${projectId}/connections`);
  const stripe = page.locator('[data-connector="stripe"]');
  await stripe.getByRole('button', { name: 'Connecter Stripe' }).click();
  await expect(page).toHaveURL(new RegExp(`/studio/${projectId}/connections\\?stripe=connected`));
  await expect(stripe.getByRole('status')).toContainText('Stripe est connecté');
  await expect(stripe.getByRole('button', { name: 'Déconnecter Stripe' })).toBeVisible();

  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    // Le visiteur réserve : carte refusée, puis carte de test acceptée.
    await page.goto(`/studio/${projectId}/preview`);
    await waitForPreview(page, (srcdoc) => srcdoc.includes('action="/api/public/bookings"'), 'formulaire de rendez-vous');
    await fillBooking(previewFrame(page), date, 'Marie Dupont');
    await expect(previewFrame(page).getByRole('heading', { name: 'Paiement' })).toBeVisible({ timeout: 60_000 });
    await expect(previewFrame(page).locator('body')).toContainText('26,70 €'); // 30 % de 89 €
    await previewFrame(page).locator('input[name="card"]').fill('4000 0000 0000 0002');
    await previewFrame(page).getByRole('button', { name: 'Payer' }).click();
    await expect(previewFrame(page).getByRole('alert')).toContainText('refusée', { timeout: 60_000 });
    expect(await sql`select 1 from bookings where project_id = ${projectId} and status = 'confirmed'`).toHaveLength(0);
    await previewFrame(page).locator('input[name="card"]').fill('4242 4242 4242 4242');
    await previewFrame(page).getByRole('button', { name: 'Payer' }).click();
    await expect(previewFrame(page).getByRole('heading', { name: 'Rendez-vous confirmé' })).toBeVisible({ timeout: 60_000 });

    // L'argent est attribué au compte connecté du commerçant (celui de sa connexion), montant = acompte.
    const [booking] = await sql<{ id: string; status: string; due_cents: number; total_cents: number; stripe_account_id: string; stripe_payment_intent_id: string; starts_at: Date }[]>`select id, status, due_cents, total_cents, stripe_account_id, stripe_payment_intent_id, starts_at from bookings where project_id = ${projectId} and status = 'confirmed'`;
    expect(booking).toMatchObject({ status: 'confirmed', due_cents: 2670, total_cents: 8900 });
    expect(booking.stripe_account_id).toMatch(/^acct_sim_/);
    expect(booking.stripe_payment_intent_id).toContain('sim_pi_');
    expect(booking.starts_at.toISOString()).toBe(parisInstant(date, '10:00').toISOString());
    const [connection] = await sql<{ credentials: string }[]>`select c.credentials from connections c join projects p on p.workspace_id = c.workspace_id where p.id = ${projectId} and c.provider = 'stripe'`;
    expect(connection.credentials).toMatch(/^v1\./);
    expect(connection.credentials).not.toContain(booking.stripe_account_id);

    // Le même créneau n'est plus disponible.
    const taken = await request.post('/api/public/bookings', { multipart: { site: projectId, service: 'Diagnostic chaudière', date, time: '10:00', nom: 'Autre client', email: 'autre@example.com' } });
    expect(taken.status()).toBe(422);
    expect(await taken.text()).toContain('vient d’être réservé');
    // Hors horaires (dimanche) : refusé.
    const sunday = new Date(); sunday.setUTCDate(sunday.getUTCDate() + 10); while (sunday.getUTCDay() !== 0) sunday.setUTCDate(sunday.getUTCDate() + 1);
    const closed = await request.post('/api/public/bookings', { multipart: { site: projectId, service: 'Diagnostic chaudière', date: sunday.toISOString().slice(0, 10), time: '10:00', nom: 'X', email: 'x@example.com' } });
    expect(await closed.text()).toContain('en dehors des horaires');

    // Le commerçant voit le rendez-vous et annule : l'acompte est remboursé.
    await page.goto(`/studio/${projectId}/bookings`);
    const row = page.getByRole('table', { name: 'Rendez-vous' }).locator('tbody tr');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Marie Dupont');
    await expect(row).toContainText('Acompte payé : 26,70 €');
    await row.getByRole('button', { name: /annuler le rendez-vous de Marie Dupont et rembourser/i }).click();
    await expect(page.getByRole('status')).toContainText('l’acompte a été remboursé');
    await expect(row).toContainText('Annulé et remboursé');
    expect((await sql`select status from bookings where id = ${booking.id}`)[0].status).toBe('refunded');

    // Après remboursement le créneau est de nouveau libre, et la déconnexion de Stripe supprime l'identifiant du compte.
    await page.goto(`/studio/${projectId}/connections`);
    await page.locator('[data-connector="stripe"]').getByRole('button', { name: 'Déconnecter Stripe' }).click();
    await expect(page.locator('[data-connector="stripe"]').getByRole('status')).toContainText('déconnecté');
    expect(await sql`select 1 from connections c join projects p on p.workspace_id = c.workspace_id where p.id = ${projectId} and c.provider = 'stripe'`).toHaveLength(0);
  } finally {
    await sql.end();
  }
});
