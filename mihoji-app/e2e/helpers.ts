import { expect, type BrowserContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

export type E2eState = { email: string; userId: string; workspaceId: string; projectId: string; legacyProjectId: string; qualityProjectId: string; session: unknown };

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
