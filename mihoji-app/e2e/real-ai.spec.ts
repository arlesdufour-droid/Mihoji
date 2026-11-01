import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Parcours EXACT de l'interface avec la vraie clé Groq (pas de AI_MOCK) :
// ouvrir le Studio, envoyer une demande dans le chat, vérifier que l'aperçu change
// et que la réponse affichée en mode simple ne contient jamais de code.

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

function previewSrcdoc(page: Page) {
  return page.locator('iframe[title="Aperçu du site généré"]').getAttribute('srcdoc');
}

async function waitForPreview(page: Page, predicate: (srcdoc: string) => boolean, description: string) {
  await expect(async () => {
    const srcdoc = await previewSrcdoc(page);
    expect(srcdoc && predicate(srcdoc), `aperçu attendu : ${description}`).toBe(true);
  }).toPass({ timeout: 90_000, intervals: [1_000, 2_000, 3_000] });
}

async function sendChat(page: Page, prompt: string) {
  await page.getByPlaceholder('Décrivez votre site…').fill(prompt);
  await page.getByTitle('Envoyer la demande').click();
}

function lastAssistantMessage(page: Page) {
  return page.locator('aside div.leading-6').last();
}

async function expectNoCode(message: ReturnType<typeof lastAssistantMessage>) {
  await expect(message).toBeVisible({ timeout: 90_000 });
  const text = await message.textContent();
  expect(text).toBeTruthy();
  for (const marker of ['```', '<section', '<div', '</', 'className', 'color:', '{', '}', '.tsx', '.html', 'Bon codage']) {
    expect(text, `la réponse ne doit pas contenir « ${marker} »`).not.toContain(marker);
  }
}

test('le chat du Studio modifie réellement le site avec la vraie clé Groq, sans code visible', async ({ page, context }) => {
  await login(page, context);
  await waitForPreview(page, (srcdoc) => srcdoc.includes('Boulangerie E2E'), 'chargement initial');

  await sendChat(page, 'Ajoute une section Nos spécialités avec 3 pains');
  await waitForPreview(page, (srcdoc) => /spécialit/i.test(srcdoc), 'section Nos spécialités ajoutée');
  await expectNoCode(lastAssistantMessage(page));
  const afterSpecialites = await previewSrcdoc(page);

  await sendChat(page, 'Change la couleur des titres en bleu foncé');
  await waitForPreview(page, (srcdoc) => srcdoc !== afterSpecialites && /blue|bleu|#[0-9a-f]{6}/i.test(srcdoc), 'titres en bleu foncé');
  await expectNoCode(lastAssistantMessage(page));
});
