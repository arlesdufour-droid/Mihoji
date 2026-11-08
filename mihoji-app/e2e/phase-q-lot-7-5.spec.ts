import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import { createOnboardingUser, fillMissingFields, previewFrame, waitForPreview } from './helpers';

// Lot 7, étape 5 (AI_MOCK=1, Stripe SIMULÉ, emails simulés) : petite boutique click & collect, paiement en ligne direct au commerçant ou au retrait.
function nextOpenDay(minDaysAhead: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + minDaysAhead);
  while (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1); // fermé le dimanche
  return date.toISOString().slice(0, 10);
}

test('L7.5 boutique : commande payée en ligne (carte refusée puis acceptée), commande payée au retrait, prix côté serveur, retrait et remboursement', async ({ page, context, request }) => {
  test.setTimeout(300_000);
  await createOnboardingUser(context);
  await page.goto('/onboarding/manual');
  await page.getByLabel('Nom de votre entreprise').fill('Quincaillerie Martin');
  await page.getByLabel('Votre métier ou activité').fill('Quincaillerie');
  await page.getByLabel(/Adresse/).fill('3 rue des Lilas, 44000 Nantes');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await fillMissingFields(page);
  await page.getByLabel('Votre demande').fill('Un site pour ma boutique avec commande en ligne et retrait en magasin');
  await page.getByRole('button', { name: 'Créer mon site' }).click();
  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}\/preview$/, { timeout: 90_000 });
  const projectId = page.url().match(/studio\/([0-9a-f-]{36})\//)![1];
  await waitForPreview(page, (srcdoc) => srcdoc.includes('action="/api/public/orders"'), 'formulaire de commande');
  const date = nextOpenDay(3);

  // Le commerçant branche Stripe (compte connecté simulé).
  await page.goto(`/studio/${projectId}/connections`);
  await page.locator('[data-connector="stripe"]').getByRole('button', { name: 'Connecter Stripe' }).click();
  await expect(page.locator('[data-connector="stripe"]').getByRole('status')).toContainText('Stripe est connecté');

  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    await page.goto(`/studio/${projectId}/preview`);
    await waitForPreview(page, (srcdoc) => srcdoc.includes('action="/api/public/orders"'), 'formulaire de commande');
    const frame = previewFrame(page);
    const form = frame.locator('form[action$="/api/public/orders"]');

    // Commande payée en ligne : 1 mitigeur (139 €) + 2 kits (2 × 19,50 €) = 178 €.
    await form.locator('input[name="qty_0"]').fill('1');
    await form.locator('input[name="qty_2"]').fill('2');
    await form.locator('input[name="date"]').fill(date);
    await form.locator('select[name="time"]').selectOption('10:00');
    await form.locator('input[name="nom"]').fill('Marie Dupont');
    await form.locator('input[name="email"]').fill('marie@example.com');
    await form.getByRole('button', { name: 'Commander', exact: true }).click();
    await expect(frame.getByRole('heading', { name: 'Paiement' })).toBeVisible({ timeout: 60_000 });
    await expect(frame.locator('body')).toContainText('178,00 €');
    await frame.locator('input[name="card"]').fill('4000 0000 0000 0002');
    await frame.getByRole('button', { name: 'Payer' }).click();
    await expect(frame.getByRole('alert')).toContainText('refusée', { timeout: 60_000 });
    expect(await sql`select 1 from orders where project_id = ${projectId} and status = 'confirmed'`).toHaveLength(0);
    await frame.locator('input[name="card"]').fill('4242 4242 4242 4242');
    await frame.getByRole('button', { name: 'Payer' }).click();
    await expect(frame.getByRole('heading', { name: 'Commande confirmée' })).toBeVisible({ timeout: 60_000 });
    await expect(frame.locator('body')).toContainText('Votre paiement a bien été reçu');

    const [paid] = await sql<{ id: string; total_cents: number; payment_mode: string; status: string; stripe_account_id: string; stripe_payment_intent_id: string; lines: { name: string; quantity: number; unitCents: number }[] }[]>`select id, total_cents, payment_mode, status, stripe_account_id, stripe_payment_intent_id, lines from orders where project_id = ${projectId} and status = 'confirmed'`;
    expect(paid).toMatchObject({ total_cents: 17800, payment_mode: 'online', status: 'confirmed' });
    expect(paid.stripe_account_id).toMatch(/^acct_sim_/);
    expect(paid.stripe_payment_intent_id).toContain('sim_pi_');
    expect(paid.lines).toEqual([{ name: 'Mitigeur thermostatique', unitCents: 13900, quantity: 1 }, { name: 'Kit détartrage chauffe-eau', unitCents: 1950, quantity: 2 }]);

    // Commande payée au retrait (le client choisit « Payer au retrait ») : aucune page de paiement.
    await page.goto(`/studio/${projectId}/preview`);
    await waitForPreview(page, (srcdoc) => srcdoc.includes('action="/api/public/orders"'), 'formulaire de commande');
    const form2 = previewFrame(page).locator('form[action$="/api/public/orders"]');
    await form2.locator('input[name="qty_1"]').fill('3');
    await form2.locator('input[name="date"]').fill(date);
    await form2.locator('select[name="time"]').selectOption('11:00');
    await form2.locator('input[name="nom"]').fill('Paul Durand');
    await form2.locator('input[name="email"]').fill('paul@example.com');
    await form2.getByLabel('Payer au retrait').check();
    await form2.getByRole('button', { name: 'Commander', exact: true }).click();
    await expect(previewFrame(page).getByRole('heading', { name: 'Commande confirmée' })).toBeVisible({ timeout: 60_000 });
    await expect(previewFrame(page).locator('body')).toContainText('Vous réglerez au retrait');
    expect((await sql`select payment_mode, status, total_cents from orders where customer_name = 'Paul Durand' and project_id = ${projectId}`)[0]).toMatchObject({ payment_mode: 'on_pickup', status: 'confirmed', total_cents: 10470 });

    // Les prix viennent du serveur : un champ de prix envoyé par le navigateur est ignoré ; panier vide et quantité excessive refusés.
    const base = { site: projectId, date, time: '10:30', nom: 'Test', email: 'test@example.com', pay: 'on_pickup' };
    const tampered = await request.post('/api/public/orders', { multipart: { ...base, qty_0: '1', total: '1', price_0: '0', unit_price: '0.01' }, maxRedirects: 0 });
    expect(tampered.status()).toBe(303);
    expect((await sql`select total_cents from orders where customer_name = 'Test' and project_id = ${projectId}`)[0].total_cents).toBe(13900);
    expect(await (await request.post('/api/public/orders', { multipart: { ...base, qty_0: '0' } })).text()).toContain('panier est vide');
    expect(await (await request.post('/api/public/orders', { multipart: { ...base, qty_0: '99' } })).text()).toContain('quantité n’est pas valide');
    expect(await (await request.post('/api/public/orders', { multipart: { ...base, qty_0: '1', time: '03:00' } })).text()).toContain('en dehors des horaires');

    // Le commerçant gère les commandes : retrait effectué, annulation avec remboursement.
    await page.goto(`/studio/${projectId}/orders`);
    const table = page.getByRole('table', { name: 'Commandes' });
    await expect(table.locator('tbody tr')).toHaveCount(3);
    const marie = table.locator('tbody tr', { hasText: 'Marie Dupont' });
    await expect(marie).toContainText('Payée en ligne');
    await expect(marie).toContainText('1 × Mitigeur thermostatique');
    await table.locator('tbody tr', { hasText: 'Paul Durand' }).getByRole('button', { name: /comme retirée/ }).click();
    await expect(page.getByRole('status')).toContainText('marquée comme retirée');
    await expect(table.locator('tbody tr', { hasText: 'Paul Durand' })).toContainText('Retirée');
    await marie.getByRole('button', { name: /Annuler la commande de Marie Dupont et rembourser/ }).click();
    await expect(page.getByRole('status')).toContainText('le paiement a été remboursé');
    await expect(marie).toContainText('Annulée et remboursée');
    expect((await sql`select status from orders where id = ${paid.id}`)[0].status).toBe('refunded');
  } finally {
    await sql.end();
  }
});
