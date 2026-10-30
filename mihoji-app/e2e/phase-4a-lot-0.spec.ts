import { expect, test } from '@playwright/test';
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

async function login(page: import('@playwright/test').Page, context: import('@playwright/test').BrowserContext) {
  await context.addCookies(authCookies());
  await page.goto(studioUrl);
  await expect(page).toHaveURL(new RegExp(`${studioUrl}$`));
}

function previewFrame(page: import('@playwright/test').Page) {
  return page.frameLocator('iframe[title="Aperçu du site généré"]');
}

async function waitForPreview(page: import('@playwright/test').Page, text: string) {
  await expect(async () => {
    expect(await page.locator('iframe[title="Aperçu du site généré"]').getAttribute('srcdoc')).toContain(text);
  }).toPass();
}

test('1. /studio/demo/preview redirige vers le dernier projet', async ({ page, context }) => {
  await context.addCookies(authCookies());
  await page.goto('/studio/demo/preview');
  await expect(page).toHaveURL(new RegExp(`${studioUrl}$`));
});

test('2. le chat en mode simple résume en français et modifie réellement le site', async ({ page, context }) => {
  await login(page, context);
  await page.getByPlaceholder('Décrivez votre site…').fill('Ajoute une phrase d’accueil chaleureuse en haut de la page');
  await page.getByTitle('Envoyer la demande').click();
  const reply = page.getByText('J’ai ajouté une phrase d’accueil chaleureuse en haut de la page.');
  await expect(reply).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Ouvrez app\/page\.tsx|```tsx/)).toHaveCount(0);
  await waitForPreview(page, 'Bienvenue, nous sommes heureux de vous accueillir.');
  await expect(previewFrame(page).getByText('Bienvenue, nous sommes heureux de vous accueillir.')).toBeVisible();
});

test('3. l’historique du chat est identique sur tous les onglets', async ({ page, context }) => {
  await login(page, context);
  await page.getByPlaceholder('Décrivez votre site…').fill('Modifie les horaires d’ouverture');
  await page.getByTitle('Envoyer la demande').click();
  await expect(page.getByText(/horaires/i).last()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('link', { name: 'Réglages' }).click();
  await expect(page.getByText('Modifie les horaires d’ouverture')).toBeVisible();
  await page.getByRole('link', { name: 'Aperçu' }).click();
  await expect(page.getByText('Modifie les horaires d’ouverture')).toBeVisible();
});

test('4. l’onglet Réglages du Studio affiche le panneau Mon site', async ({ page, context }) => {
  await login(page, context);
  await page.getByRole('link', { name: 'Réglages' }).click();
  await expect(page.getByText('Mon site')).toBeVisible();
  await expect(page.getByText('Espace settings')).toHaveCount(0);
});

test('5. l’historique des versions propose un bouton Aperçu à côté de Restaurer', async ({ page, context }) => {
  await login(page, context);
  await page.getByTitle('Historique des versions').click();
  await expect(page.getByText('Aperçu', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Restaurer', { exact: true }).first()).toBeVisible();
});

test('6. Mes informations contient directeur, capital, RCS/RM et médiateur', async ({ page, context }) => {
  await login(page, context);
  await page.getByRole('link', { name: 'Réglages' }).click();
  for (const label of ['Directeur de la publication', 'Capital social', 'Numéro RCS ou RM', /^Médiateur de la consommation/]) await expect(page.getByLabel(label)).toBeVisible();
});

test('7. l’activité et la forme juridique affichent les libellés, pas les codes', async ({ page, context }) => {
  await login(page, context);
  await waitForPreview(page, 'Boulangerie et boulangerie-pâtisserie');
  await expect(previewFrame(page).getByText('Boulangerie et boulangerie-pâtisserie')).toBeVisible();
  await expect(previewFrame(page).getByText('SAS, société par actions simplifiée')).toBeVisible();
  await page.getByRole('link', { name: 'Réglages' }).click();
  await expect(page.getByLabel('Activité')).toHaveValue('Boulangerie et boulangerie-pâtisserie');
  await expect(page.getByLabel('Forme juridique')).toHaveValue('SAS, société par actions simplifiée');
  await expect(page.getByText('10.71C')).toHaveCount(0);
  await expect(page.getByText('Entreprise enregistrée')).toHaveCount(0);
});

test('8. l’avertissement de conformité ne réclame pas email et téléphone déjà remplis', async ({ page, context }) => {
  await login(page, context);
  await page.getByRole('link', { name: 'Réglages' }).click();
  const warning = page.getByText('Mentions légales incomplètes');
  await expect(warning).toContainText('Directeur');
  await expect(warning).not.toContainText('Email');
  await expect(warning).not.toContainText('Téléphone');
});

test('9. la publication est bloquée tant qu’un point de conformité est rouge', async ({ page, context }) => {
  await login(page, context);
  await page.getByRole('button', { name: 'Mettre en ligne' }).click();
  await expect(page.getByRole('status')).toContainText('Publication bloquée', { timeout: 15_000 });
  await expect(page.getByRole('status')).toContainText('Directeur de la publication');
});

test('10. la facturation lit le nombre de sites en ligne depuis les publications', async ({ page, context }) => {
  await login(page, context);
  await page.goto('/settings/billing');
  await expect(page.getByText(/Sites en ligne/)).toBeVisible();
  await expect(page.getByText('0 sur 1')).toBeVisible();
});

test('11. le haut des Réglages affiche le nom réel de l’espace', async ({ page, context }) => {
  await login(page, context);
  await page.goto('/settings/general');
  await expect(page.getByText('Espace E2E réel').first()).toBeVisible();
  await expect(page.getByText('Mihoji workspace')).toHaveCount(0);
});

test('12. la liste des factures est en français', async ({ page, context }) => {
  await login(page, context);
  await page.goto('/settings/billing');
  await page.getByRole('button', { name: 'Factures' }).click();
  await expect(page.getByText(/Aucune facture/)).toBeVisible();
  await expect(page.getByText(/No invoices yet/)).toHaveCount(0);
});

test('13. aucune erreur Next.js de rendu dans le navigateur', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page, context);
  await page.getByRole('link', { name: 'Réglages' }).click();
  await expect(page.getByText('Mon site')).toBeVisible();
  await page.goto('/settings/general');
  await expect(page.getByText('Espace E2E réel').first()).toBeVisible();
  await page.goto('/settings/billing');
  await expect(page.getByText(/Sites en ligne/)).toBeVisible();
  expect(errors.filter((error) => /hydration|blocking|instant/i.test(error))).toEqual([]);
});
