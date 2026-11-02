import { expect, type BrowserContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

export type E2eState = { email: string; userId: string; workspaceId: string; projectId: string; legacyProjectId: string; qualityProjectId: string; siteProjectId: string; session: unknown };

export function readState(): E2eState {
  return JSON.parse(readFileSync('e2e/.state.json', 'utf8')) as E2eState;
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

export function authCookies(state: E2eState = readState()) {
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0];
  const value = `base64-${Buffer.from(JSON.stringify(state.session)).toString('base64url')}`;
  const name = `sb-${ref}-auth-token`;
  const chunks: { name: string; value: string }[] = [];
  for (let i = 0; i * 3180 < value.length; i += 1) chunks.push({ name: chunks.length === 0 && value.length <= 3180 ? name : `${name}.${chunks.length}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return chunks.map((chunk) => ({ ...chunk, domain: '127.0.0.1', path: '/' }));
}

export async function login(page: Page, context: BrowserContext, projectId = readState().projectId) {
  const url = `/studio/${projectId}/preview`;
  await context.addCookies(authCookies());
  await page.goto(url);
  await expect(page).toHaveURL(new RegExp(`${url}$`));
}

export function previewFrame(page: Page) {
  return page.frameLocator('iframe[title="Aperçu du site généré"]');
}

export function previewSrcdoc(page: Page) {
  return page.locator('iframe[title="Aperçu du site généré"]').getAttribute('srcdoc');
}

export async function waitForPreview(page: Page, predicate: (srcdoc: string) => boolean, description: string, timeout = 30_000) {
  await expect(async () => {
    const srcdoc = await previewSrcdoc(page);
    expect(srcdoc && predicate(srcdoc), `aperçu attendu : ${description}\n${srcdoc?.slice(0, 1800)}`).toBe(true);
  }).toPass({ timeout });
}

export async function sendChat(page: Page, prompt: string) {
  await page.getByPlaceholder('Décrivez votre site…').fill(prompt);
  await page.getByTitle('Envoyer la demande').click();
}

export function lastAssistantMessage(page: Page) {
  return page.locator('aside div.leading-6').last();
}

export async function versionCount(page: Page, projectId: string): Promise<number> {
  const response = await page.request.get(`/api/projects/${projectId}/versions`);
  expect(response.ok()).toBe(true);
  return ((await response.json()) as unknown[]).length;
}

// Utilisateur de test tout neuf (sans entreprise ni projet) pour rejouer l'onboarding. Son email est reconnaissable (e2e+…@mihoji.test) :
// le teardown global le supprime avec toutes ses données.
export async function createOnboardingUser(context: BrowserContext): Promise<{ email: string }> {
  const { createClient } = await import('@supabase/supabase-js');
  const email = `e2e+onb${Date.now()}${Math.floor(Math.random() * 1000)}@mihoji.test`;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error('e2e_user_creation_failed');
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link.data.properties?.hashed_token;
  if (link.error || !tokenHash) throw link.error ?? new Error('e2e_magic_link_failed');
  const verifier = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const verified = await verifier.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
  if (verified.error || !verified.data.session) throw verified.error ?? new Error('e2e_session_failed');
  await context.addCookies(authCookies({ ...readState(), session: verified.data.session }));
  return { email };
}

// Remplit l'étape « informations manquantes » de l'onboarding.
export async function fillMissingFields(page: Page) {
  await expect(page.getByRole('heading', { name: 'Complétez les informations de votre site' })).toBeVisible();
  await page.getByLabel('Email de contact').fill('contact@onboarding.test');
  await page.getByLabel('Téléphone de contact').fill('0546000000');
  await page.getByRole('button', { name: 'Continuer' }).click();
}
