import { expect, test } from '@playwright/test';
import { auditPage } from './design-audit';
import { authCookies } from './helpers';

// Les e2e tournent en simulation (AI_MOCK=1, sans clé) : le parcours est le même qu'avec le vrai modèle de design.
test.beforeEach(async ({ context }) => { await context.addCookies(authCookies()); });

test('Q2.1 un administrateur génère un site avec ses modules, le voit, puis en change le style', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/admin/design');
  await page.getByRole('link', { name: 'Générer un site avec l’IA' }).click();
  await expect(page.getByRole('heading', { name: 'Génération par le modèle de design' })).toBeVisible();
  await expect(page.getByTestId('design-provider')).toHaveText('Simulation');

  await page.getByRole('button', { name: 'Coach sportif (rendez-vous et paiement)' }).click();
  await expect(page.getByLabel('Décrivez le site que vous voulez')).toHaveValue(/réserver une séance en ligne et payer en ligne/);
  await page.getByRole('button', { name: 'Générer le site' }).click();
  await expect(page).toHaveURL(/\/admin\/design\/generate\?id=/);
  await expect(page.getByRole('heading', { name: 'Site généré' })).toBeVisible();
  await expect(page.getByTestId('generation-modules')).toContainText('Prise de rendez-vous');
  await expect(page.getByTestId('generation-modules')).toContainText('Paiement en ligne');
  await expect(page.getByTestId('generation-cost')).toHaveText(/0,000/);

  const frame = page.frameLocator('iframe[title="Site généré"]');
  await expect(frame.locator('#reservation')).toBeVisible();
  await expect(frame.locator('#reservation').getByRole('button', { name: 'Réserver en ligne' })).toBeDisabled();
  await expect(frame.locator('#reservation').getByText('Bientôt disponible')).toBeVisible();
  await expect(frame.locator('#tarifs').getByRole('button', { name: 'Payer en ligne' })).toBeDisabled();
  await expect(frame.locator('header').getByRole('link', { name: 'Réserver' }).first()).toHaveAttribute('href', '#reservation');

  const firstUrl = page.url();
  await page.getByLabel('Changement de style').fill('Un style plus élégant');
  await page.getByRole('button', { name: 'Changer le style' }).click();
  await expect(page).not.toHaveURL(firstUrl);
  await expect(page.getByRole('region', { name: 'Génération sélectionnée' }).getByText('Élégant premium', { exact: true })).toBeVisible();
  await expect(page.frameLocator('iframe[title="Site généré"]').locator('html')).toHaveAttribute('data-style', 'premium');
  await expect(page.getByRole('row').filter({ hasText: 'Style' }).first()).toContainText('Un style plus élégant');
});

test('Q2.2 les trois demandes d’exemple produisent un site lisible, sans débordement, avec le bon module', async ({ page }) => {
  test.setTimeout(180_000);
  const cases = [
    { button: 'Boulangerie (click & collect)', anchor: '#commande', module: 'Boutique et commande' },
    { button: 'Coach sportif (rendez-vous et paiement)', anchor: '#reservation', module: 'Prise de rendez-vous' },
    { button: 'Plombier (demande de devis)', anchor: '#devis', module: 'Demande de devis' },
  ];
  for (const item of cases) {
    await page.goto('/admin/design/generate');
    await page.getByRole('button', { name: item.button }).click();
    await page.getByRole('button', { name: 'Générer le site' }).click();
    await expect(page.getByRole('heading', { name: 'Site généré' })).toBeVisible();
    await expect(page.getByTestId('generation-modules')).toContainText(item.module);
    const src = await page.locator('iframe[title="Site généré"]').getAttribute('src');
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      const site = await page.context().newPage();
      await site.setViewportSize(viewport);
      await site.goto(src!);
      await expect(site.locator(item.anchor)).toBeVisible();
      const audit = await auditPage(site);
      expect(audit.overflow, `${item.button} @${viewport.width} : débordement`).toBe(0);
      expect(audit.contrast, `${item.button} @${viewport.width} : contraste`).toEqual([]);
      expect(audit.h1Count).toBe(1);
      await site.close();
    }
  }
});

test('Q2.3 la génération et ses pages de rendu sont réservées aux administrateurs', async ({ playwright, baseURL }) => {
  const anonymous = await playwright.request.newContext({ baseURL });
  // 401 (proxy, non connecté) ou 403 (connecté mais non administrateur).
  const status = (await anonymous.post('/api/admin/design/generate', { data: { task: 'create', request: 'Site pour ma boulangerie', company: { name: 'X' } } })).status();
  expect([401, 403]).toContain(status);
  expect((await anonymous.get('/admin/design/render?generation=00000000-0000-0000-0000-000000000000')).status()).toBe(403);
  await anonymous.dispose();
});
