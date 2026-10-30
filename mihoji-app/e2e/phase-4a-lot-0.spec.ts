import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = JSON.parse(readFileSync('e2e/.state.json', 'utf8')) as { projectId: string; session: unknown };

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

function authCookies() {
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0];
  const value = `base64-${Buffer.from(JSON.stringify(state.session)).toString('base64url')}`;
  const name = `sb-${ref}-auth-token`;
  const chunks: { name: string; value: string }[] = [];
  for (let i = 0; i * 3180 < value.length; i += 1) chunks.push({ name: chunks.length === 0 && value.length <= 3180 ? name : `${name}.${chunks.length}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return chunks.map((chunk) => ({ ...chunk, domain: '127.0.0.1', path: '/' }));
}

const studioUrl = `/studio/${state.projectId}/preview`;

async function login(page: Page, context: BrowserContext) {
  await context.addCookies(authCookies());
  await page.goto(studioUrl);
  await expect(page).toHaveURL(new RegExp(`${studioUrl}$`));
}

function previewFrame(page: Page) {
  return page.frameLocator('iframe[title="Aperçu du site généré"]');
}

async function waitForPreview(page: Page, text: string) {
  await expect(async () => {
    expect(await page.locator('iframe[title="Aperçu du site généré"]').getAttribute('srcdoc')).toContain(text);
  }).toPass();
}

async function sendChat(page: Page, prompt: string) {
  await page.getByPlaceholder('Décrivez votre site…').fill(prompt);
  await page.getByTitle('Envoyer la demande').click();
}

test('1. /studio/demo/preview redirige vers le dernier projet', async ({ page, context }) => {
  await context.addCookies(authCookies());
  await page.goto('/studio/demo/preview');
  await expect(page).toHaveURL(new RegExp(`${studioUrl}$`));
});

test('2. le chat en mode simple ne montre jamais de code et modifie réellement le site', async ({ page, context }) => {
  await login(page, context);
  await sendChat(page, 'Ajoute une phrase d’accueil chaleureuse en haut de la page');
  await expect(page.getByText('J’ai ajouté une phrase d’accueil chaleureuse en haut de la page.')).toBeVisible({ timeout: 30_000 });
  const chatPanel = page.locator('aside');
  await expect(chatPanel).not.toContainText('```');
  await expect(chatPanel).not.toContainText('app/page.tsx');
  await expect(chatPanel).not.toContainText('className');
  await expect(chatPanel).not.toContainText('Bon codage');
  await waitForPreview(page, 'Bienvenue, nous sommes heureux de vous accueillir.');
  await expect(previewFrame(page).getByText('Bienvenue, nous sommes heureux de vous accueillir.')).toBeVisible();
});

test('3. aucune version n’est créée quand aucune opération n’a été appliquée', async ({ page, context }) => {
  await login(page, context);
  await page.getByTitle('Historique des versions').click();
  await expect(page.getByRole('heading', { name: 'Historique des versions' })).toBeVisible();
  const before = await page.getByRole('button', { name: 'Restaurer', exact: true }).count();
  await page.getByTitle('Fermer').click();
  await sendChat(page, 'Raconte-moi une blague');
  await expect(page.getByText('Je n’ai pas pu appliquer cette modification. Pouvez-vous reformuler ?')).toBeVisible({ timeout: 30_000 });
  await page.getByTitle('Historique des versions').click();
  const panel = page.locator('div.absolute.inset-y-0.right-0');
  await expect(panel.getByRole('heading', { name: 'Historique des versions' })).toBeVisible();
  await expect(panel).not.toContainText('Raconte-moi une blague');
  expect(await page.getByRole('button', { name: 'Restaurer', exact: true }).count()).toBe(before);
});

test('4. l’aperçu d’une ancienne version s’affiche avec un bandeau, sans restaurer', async ({ page, context }) => {
  await login(page, context);
  await page.getByTitle('Historique des versions').click();
  await page.getByRole('button', { name: 'Aperçu', exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`${studioUrl}$`));
  await expect(page.getByText(/Vous regardez la version du/)).toBeVisible();
  await expect(page.locator('iframe[title="Aperçu du site généré"]')).toBeVisible();
  await page.getByRole('button', { name: 'Revenir à la version actuelle' }).click();
  await expect(page.getByText(/Vous regardez la version du/)).toHaveCount(0);
});

test('5. l’historique du chat est identique sur tous les onglets', async ({ page, context }) => {
  await login(page, context);
  await sendChat(page, 'Modifie les horaires d’ouverture');
  await expect(page.getByText(/horaires/i).last()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('link', { name: 'Réglages' }).click();
  await expect(page.getByText('Modifie les horaires d’ouverture')).toBeVisible();
  await page.getByRole('link', { name: 'Aperçu' }).click();
  await expect(page.getByText('Modifie les horaires d’ouverture')).toBeVisible();
});

test('6. l’onglet Réglages du Studio affiche le panneau Mon site', async ({ page, context }) => {
  await login(page, context);
  await page.getByRole('link', { name: 'Réglages' }).click();
  await expect(page.getByText('Mon site')).toBeVisible();
  await expect(page.getByText('Espace settings')).toHaveCount(0);
});

test('7. l’historique des versions propose Aperçu à côté de Restaurer', async ({ page, context }) => {
  await login(page, context);
  await page.getByTitle('Historique des versions').click();
  await expect(page.getByRole('button', { name: 'Aperçu', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restaurer', exact: true }).first()).toBeVisible();
});

test('8. Mes informations contient directeur, capital, RCS/RM et médiateur', async ({ page, context }) => {
  await login(page, context);
  await page.getByRole('link', { name: 'Réglages' }).click();
  for (const label of ['Directeur de la publication', 'Capital social', 'Numéro RCS ou RM', /^Médiateur de la consommation/]) await expect(page.getByLabel(label)).toBeVisible();
});

test('9. l’activité et la forme juridique affichent les libellés, jamais les codes', async ({ page, context }) => {
  await login(page, context);
  await waitForPreview(page, 'Boulangerie et boulangerie-pâtisserie');
  await expect(previewFrame(page).getByText('Boulangerie et boulangerie-pâtisserie').first()).toBeVisible();
  await expect(previewFrame(page).getByText('SAS, société par actions simplifiée')).toBeVisible();
  const srcdoc = await page.locator('iframe[title="Aperçu du site généré"]').getAttribute('srcdoc');
  expect(srcdoc).not.toContain('10.71C');
  expect(srcdoc).not.toContain('{{company.');
  await page.getByRole('link', { name: 'Réglages' }).click();
  await expect(page.getByLabel('Activité')).toHaveValue('Boulangerie et boulangerie-pâtisserie');
  await expect(page.getByLabel('Forme juridique')).toHaveValue('SAS, société par actions simplifiée');
  await expect(page.getByText('Entreprise enregistrée')).toHaveCount(0);
});

test('10. une modification dans Mes informations se répercute sur le site sans IA', async ({ page, context }) => {
  await login(page, context);
  await page.getByRole('link', { name: 'Réglages' }).click();
  await page.getByLabel('Adresse').fill('2 rue des Lilas, 17000 La Rochelle');
  const saved = page.waitForResponse((response) => response.url().includes('/api/onboarding/company') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();
  const savedResponse = await saved;
  expect(savedResponse.status()).toBe(200);
  await page.reload();
  await page.getByRole('link', { name: 'Aperçu' }).click();
  await waitForPreview(page, '2 rue des Lilas, 17000 La Rochelle');
  await expect(previewFrame(page).getByText('2 rue des Lilas, 17000 La Rochelle')).toBeVisible();
});

test('11. l’avertissement de conformité ne réclame pas email et téléphone déjà remplis', async ({ page, context }) => {
  await login(page, context);
  await page.getByRole('link', { name: 'Réglages' }).click();
  const warning = page.getByText('Mentions légales incomplètes');
  await expect(warning).toContainText('Directeur');
  await expect(warning).not.toContainText('Email');
  await expect(warning).not.toContainText('Téléphone');
});

test('12. la publication est bloquée tant qu’un point de conformité est rouge', async ({ page, context }) => {
  await login(page, context);
  await page.getByRole('button', { name: 'Mettre en ligne' }).click();
  await expect(page.getByRole('status')).toContainText('Publication bloquée', { timeout: 15_000 });
  await expect(page.getByRole('status')).toContainText('Directeur de la publication');
});

test('13. la facturation compte les sites distincts en ligne', async ({ page, context }) => {
  await login(page, context);
  await page.goto('/settings/billing');
  await expect(page.getByText(/Sites en ligne/)).toBeVisible();
  await expect(page.getByText('1 sur 1')).toBeVisible();
});

test('14. le nom de l’espace est lisible partout', async ({ page, context }) => {
  await login(page, context);
  await page.goto('/settings/general');
  await expect(page.getByText('Boulangerie E2E').first()).toBeVisible();
  await expect(page.getByText('Mihoji workspace')).toHaveCount(0);
  await page.goto(studioUrl);
  await page.getByRole('button', { name: 'Ouvrir le menu du compte' }).click();
  await expect(page.getByText('Boulangerie E2E')).toBeVisible();
  await expect(page.getByText('Espace Mihoji')).toHaveCount(0);
});

test('15. la liste des factures est en français', async ({ page, context }) => {
  await login(page, context);
  await page.goto('/settings/billing');
  await page.getByRole('button', { name: 'Factures' }).click();
  await expect(page.getByText(/Aucune facture/)).toBeVisible();
  await expect(page.getByText(/No invoices yet/)).toHaveCount(0);
});

test('16. aucune erreur d’hydratation ni erreur console sur Studio, Réglages et Facturation', async ({ page, context }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !/favicon|Failed to load resource|net::/i.test(message.text())) consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await login(page, context);
  await page.getByRole('link', { name: 'Réglages' }).click();
  await expect(page.getByText('Mon site')).toBeVisible();
  await page.goto('/settings/general');
  await expect(page.getByText('Boulangerie E2E').first()).toBeVisible();
  await page.goto('/settings/billing');
  await expect(page.getByText(/Sites en ligne/)).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(consoleErrors.filter((error) => /hydration|did not match|Minified React error|instant|blocking/i.test(error))).toEqual([]);
});
