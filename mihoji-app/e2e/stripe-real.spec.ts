import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import postgres from 'postgres';
import Stripe from 'stripe';
import { encryptSecret, loadEncryptionKey } from '../src/lib/connectors/crypto';
import { connectors } from '../src/lib/connectors/registry';
import { createOnboardingUser, fillMissingFields, waitForPreview } from './helpers';

// TEST RÉEL de Stripe, MODE TEST uniquement (voir playwright.stripe.config.ts) : rendez-vous avec acompte (7.4) et boutique (7.5) payés sur la vraie page
// Stripe Checkout avec les cartes de test officielles, confirmés par le webhook réel (Stripe CLI), puis remboursés. On vérifie par l'API Stripe que l'argent
// est bien encaissé sur le COMPTE CONNECTÉ du commerçant (paiement direct), qu'il n'existe pas chez la plateforme, et que le remboursement part du compte connecté.
// Prérequis : STRIPE_SECRET_KEY (sk_test_) et STRIPE_WEBHOOK_SECRET dans .env.local, `stripe listen` actif, et un compte connecté de test dont l'inscription est terminée
// (identifiant dans e2e/.stripe-account.json ou STRIPE_TEST_ACCOUNT_ID). Aucune clé n'est jamais affichée.
const GOOD = '4242424242424242';
const DECLINED = '4000000000000002';

function accountId(): string {
  const fromEnv = process.env.STRIPE_TEST_ACCOUNT_ID?.trim();
  if (fromEnv) return fromEnv;
  if (existsSync('e2e/.stripe-account.json')) return (JSON.parse(readFileSync('e2e/.stripe-account.json', 'utf8')) as { id: string }).id;
  throw new Error('Aucun compte connecté de test : renseignez e2e/.stripe-account.json ({"id":"acct_…"}).');
}

function nextOpenDay(minDaysAhead: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + minDaysAhead);
  while (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

// Remplit la vraie page de paiement Stripe avec une carte de test et valide.
async function payWith(page: Page, card: string) {
  await page.locator('#cardNumber').waitFor({ timeout: 60_000 });
  await page.locator('#cardNumber').fill(card);
  await page.locator('#cardExpiry').fill('12 / 34');
  await page.locator('#cardCvc').fill('123');
  const name = page.locator('#billingName');
  if (await name.count()) await name.fill('Marie Dupont');
  const postal = page.locator('#billingPostalCode');
  if (await postal.count()) await postal.fill('75001');
  await page.locator('[data-testid="hosted-payment-submit-button"], button.SubmitButton').first().click();
}

test.describe.configure({ mode: 'serial' });

test('S0 la clé est en mode test, le compte connecté de test est prêt à encaisser, le webhook est configuré', async () => {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  expect(key.startsWith('sk_test_'), 'STRIPE_SECRET_KEY doit être une clé de TEST').toBe(true);
  expect((process.env.STRIPE_WEBHOOK_SECRET ?? '').startsWith('whsec_'), 'STRIPE_WEBHOOK_SECRET manquant').toBe(true);
  const stripe = new Stripe(key) as unknown as { v2: { core: { accounts: { retrieve: (id: string, p: unknown) => Promise<{ configuration?: { merchant?: { capabilities?: { card_payments?: { status?: string } } } } }> } } } };
  const account = await stripe.v2.core.accounts.retrieve(accountId(), { include: ['configuration.merchant'] });
  expect(account.configuration?.merchant?.capabilities?.card_payments?.status, 'le compte connecté de test doit avoir terminé son inscription (capacité de paiement active)').toBe('active');
});

async function createSiteWithStripeConnected(page: Page, context: import('@playwright/test').BrowserContext, request: string, company: string) {
  await createOnboardingUser(context);
  await page.goto('/onboarding/manual');
  await page.getByLabel('Nom de votre entreprise').fill(company);
  await page.getByLabel('Votre métier ou activité').fill('Plombier chauffagiste');
  await page.getByLabel(/Adresse/).fill('3 rue des Lilas, 44000 Nantes');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await fillMissingFields(page);
  await page.getByLabel('Votre demande').fill(request);
  await page.getByRole('button', { name: 'Créer mon site' }).click();
  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}\/preview$/, { timeout: 90_000 });
  const projectId = page.url().match(/studio\/([0-9a-f-]{36})\//)![1];
  await waitForPreview(page, (srcdoc) => srcdoc.startsWith('<!doctype html>'), 'site créé');
  // Le commerçant « a branché Stripe » : son compte connecté de test (inscription terminée) est enregistré, chiffré, pour son espace.
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const [project] = await sql<{ workspace_id: string }[]>`select workspace_id from projects where id = ${projectId}`;
  const capabilities = connectors.find((connector) => connector.id === 'stripe')!.capabilities;
  await sql`insert into connections (workspace_id, provider, account_label, credentials, scopes) values (${project.workspace_id}, 'stripe', 'Compte Stripe de test', ${encryptSecret(accountId(), loadEncryptionKey())}, ${sql.array([...capabilities])})`;
  return { projectId, sql };
}

async function stripeProof(paymentIntentId: string, expectedCents: number) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const acct = accountId();
  // 1) Le paiement existe sur le COMPTE CONNECTÉ, pour le bon montant, réussi, en paiement direct (aucune commission ni transfert de la plateforme).
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] }, { stripeAccount: acct });
  expect(intent.status).toBe('succeeded');
  expect(intent.amount_received).toBe(expectedCents);
  expect(intent.currency).toBe('eur');
  const charge = intent.latest_charge as Stripe.Charge;
  expect(charge.application_fee_amount ?? null).toBeNull();
  expect(charge.transfer_data ?? null).toBeNull();
  expect(charge.paid).toBe(true);
  // 2) Il n'existe PAS chez la plateforme : l'argent n'est pas passé par Mihoji.
  await expect(stripe.paymentIntents.retrieve(paymentIntentId)).rejects.toMatchObject({ code: 'resource_missing' });
  // 3) Le solde du compte connecté enregistre la transaction.
  const transactions = await stripe.balanceTransactions.list({ limit: 10 }, { stripeAccount: acct });
  expect(transactions.data.some((transaction) => transaction.source === charge.id && transaction.amount === expectedCents)).toBe(true);
  return { chargeId: charge.id, acct };
}

async function refundProof(paymentIntentId: string, expectedCents: number) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const refunds = await stripe.refunds.list({ payment_intent: paymentIntentId }, { stripeAccount: accountId() });
  expect(refunds.data).toHaveLength(1);
  expect(refunds.data[0]).toMatchObject({ status: 'succeeded', amount: expectedCents, currency: 'eur' });
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] }, { stripeAccount: accountId() });
  expect((intent.latest_charge as Stripe.Charge).refunded).toBe(true);
}

test('S1 « Connecter Stripe » démarre l’inscription hébergée par Stripe (compte créé par l’API v2, aucune donnée du commerçant chez Mihoji)', async ({ page, context }) => {
  await createOnboardingUser(context);
  await page.goto('/onboarding/manual');
  await page.getByLabel('Nom de votre entreprise').fill('Boutique Test Stripe');
  await page.getByLabel('Votre métier ou activité').fill('Quincaillerie');
  await page.getByLabel(/Adresse/).fill('3 rue des Lilas, 44000 Nantes');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await fillMissingFields(page);
  const response = await page.request.post('/api/connections/stripe/start');
  expect(response.status()).toBe(200);
  const { url } = await response.json() as { url: string };
  expect(url.startsWith('https://connect.stripe.com/')).toBe(true);
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    const rows = await sql<{ credentials: string; scopes: string[] }[]>`select c.credentials, c.scopes from connections c join workspace_members m on m.workspace_id = c.workspace_id join users u on u.id = m.user_id where c.provider = 'stripe' and u.email like 'e2e+%'`;
    // Connexion « en cours » : identifiant chiffré, aucun droit accordé tant que l'inscription n'est pas terminée (la liste des outils ne la montre pas comme connectée).
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.at(-1)!.credentials).toMatch(/^v1\./);
    expect(rows.at(-1)!.scopes).toEqual([]);
    const list = await (await page.request.get('/api/connections')).json() as { id: string; connected: boolean }[];
    expect(list.find((item) => item.id === 'stripe')!.connected).toBe(false);
  } finally {
    await sql.end();
  }
});

test('S2 rendez-vous avec acompte (7.4) : carte refusée puis acceptée, argent sur le compte connecté, webhook, remboursement', async ({ page, context, request }) => {
  const { projectId, sql } = await createSiteWithStripeConnected(page, context, 'Un site de plombier avec prise de rendez-vous et acompte en ligne', 'Lefèvre Plomberie');
  try {
    const date = nextOpenDay(3);
    // Le visiteur réserve : le serveur crée une vraie session Stripe Checkout sur le compte connecté et redirige vers la page de paiement de Stripe.
    const booking = await request.post('/api/public/bookings', { multipart: { site: projectId, service: 'Diagnostic chaudière', date, time: '10:00', nom: 'Marie Dupont', email: 'marie.dupont@example.com', telephone: '0612345678' }, maxRedirects: 0 });
    expect(booking.status()).toBe(303);
    const checkoutUrl = booking.headers().location;
    expect(checkoutUrl.startsWith('https://checkout.stripe.com/')).toBe(true);

    await page.goto(checkoutUrl);
    await expect(page.locator('body')).toContainText('26.70');
    // Carte refusée : Stripe affiche le refus, rien n'est confirmé chez Mihoji.
    await payWith(page, DECLINED);
    await expect(page.locator('body')).toContainText(/declined/i, { timeout: 60_000 });
    expect(await sql`select 1 from bookings where project_id = ${projectId} and status = 'confirmed'`).toHaveLength(0);
    // Carte de test acceptée : redirection vers la page de retour, puis confirmation par le WEBHOOK réel.
    await page.reload();
    await payWith(page, GOOD);
    await page.waitForURL(/\/api\/public\/bookings\/done\?b=/, { timeout: 90_000 });
    await expect.poll(async () => (await sql<{ status: string }[]>`select status from bookings where project_id = ${projectId}`)[0].status, { timeout: 90_000, message: 'le webhook Stripe doit confirmer le rendez-vous' }).toBe('confirmed');
    await page.reload();
    await expect(page.locator('body')).toContainText('Rendez-vous confirmé');

    const [row] = await sql<{ id: string; due_cents: number; stripe_account_id: string; stripe_payment_intent_id: string }[]>`select id, due_cents, stripe_account_id, stripe_payment_intent_id from bookings where project_id = ${projectId}`;
    expect(row.due_cents).toBe(2670);
    expect(row.stripe_account_id).toBe(accountId());
    expect(row.stripe_payment_intent_id).toMatch(/^pi_/);
    await stripeProof(row.stripe_payment_intent_id, 2670);

    // Le commerçant annule : l'acompte est remboursé DEPUIS le compte connecté.
    await page.goto(`/studio/${projectId}/bookings`);
    const line = page.getByRole('table', { name: 'Rendez-vous' }).locator('tbody tr');
    await expect(line).toContainText('Acompte payé : 26,70 €');
    await line.getByRole('button', { name: /annuler le rendez-vous de Marie Dupont et rembourser/i }).click();
    await expect(page.getByRole('status')).toContainText('l’acompte a été remboursé', { timeout: 60_000 });
    expect((await sql`select status from bookings where id = ${row.id}`)[0].status).toBe('refunded');
    await refundProof(row.stripe_payment_intent_id, 2670);
  } finally {
    await sql.end();
  }
});

test('S3 boutique (7.5) : commande de 178 € payée sur Stripe, argent sur le compte connecté, webhook, remboursement', async ({ page, context, request }) => {
  const { projectId, sql } = await createSiteWithStripeConnected(page, context, 'Un site pour ma boutique avec commande en ligne et retrait en magasin', 'Quincaillerie Martin');
  try {
    const date = nextOpenDay(3);
    const order = await request.post('/api/public/orders', { multipart: { site: projectId, qty_0: '1', qty_2: '2', date, time: '10:00', nom: 'Marie Dupont', email: 'marie.dupont@example.com', pay: 'online' }, maxRedirects: 0 });
    expect(order.status()).toBe(303);
    const checkoutUrl = order.headers().location;
    expect(checkoutUrl.startsWith('https://checkout.stripe.com/')).toBe(true);
    await page.goto(checkoutUrl);
    await expect(page.locator('body')).toContainText('178.00');
    await payWith(page, DECLINED);
    await expect(page.locator('body')).toContainText(/declined/i, { timeout: 60_000 });
    expect(await sql`select 1 from orders where project_id = ${projectId} and status = 'confirmed'`).toHaveLength(0);
    await page.reload();
    await payWith(page, GOOD);
    await page.waitForURL(/\/api\/public\/bookings\/done\?o=/, { timeout: 90_000 });
    await expect.poll(async () => (await sql<{ status: string }[]>`select status from orders where project_id = ${projectId}`)[0].status, { timeout: 90_000, message: 'le webhook Stripe doit confirmer la commande' }).toBe('confirmed');
    await page.reload();
    await expect(page.locator('body')).toContainText('Commande confirmée');

    const [row] = await sql<{ id: string; total_cents: number; stripe_account_id: string; stripe_payment_intent_id: string }[]>`select id, total_cents, stripe_account_id, stripe_payment_intent_id from orders where project_id = ${projectId}`;
    expect(row.total_cents).toBe(17800);
    expect(row.stripe_account_id).toBe(accountId());
    await stripeProof(row.stripe_payment_intent_id, 17800);

    await page.goto(`/studio/${projectId}/orders`);
    const line = page.getByRole('table', { name: 'Commandes' }).locator('tbody tr');
    await expect(line).toContainText('Payée en ligne');
    await line.getByRole('button', { name: /Annuler la commande de Marie Dupont et rembourser/ }).click();
    await expect(page.getByRole('status')).toContainText('le paiement a été remboursé', { timeout: 60_000 });
    expect((await sql`select status from orders where id = ${row.id}`)[0].status).toBe('refunded');
    await refundProof(row.stripe_payment_intent_id, 17800);
  } finally {
    await sql.end();
  }
});
