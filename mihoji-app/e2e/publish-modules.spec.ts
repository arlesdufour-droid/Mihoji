import { expect, test, type Browser } from '@playwright/test';
import postgres from 'postgres';
import { authCookies, readState, withCompleteCompliance } from './helpers';

// Étape 4 : les formulaires du site publié fonctionnent depuis son nom d'hôte (sous-domaine). Sans IA, sans Vercel, sans Stripe réel.
const state = readState();
const DOMAIN = 'sites.mihoji.test';
test.describe.configure({ mode: 'serial' });

async function publish(browser: Browser, projectId: string): Promise<string> {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' });
  await context.addCookies(authCookies());
  try {
    return await withCompleteCompliance(state.workspaceId, async () => {
      const response = await context.request.post(`/api/projects/${projectId}/publish`);
      expect(response.status(), await response.text()).toBe(200);
      return (JSON.parse(await response.text()) as { subdomain: string }).subdomain;
    });
  } finally { await context.close(); }
}

test('M1 le formulaire de contact du site publié envoie la demande à l’application depuis le nom d’hôte du site', async ({ request, browser }) => {
  const slug = await publish(browser, state.siteProjectId);
  const host = `${slug}.${DOMAIN}`;
  const html = await (await request.get('/', { headers: { host } })).text();
  const form = html.match(/<form[^>]*data-lead="(?:contact|quote)"[^>]*>[\s\S]*?<\/form>/)?.[0];
  expect(form, 'le site de test doit contenir un formulaire de contact ou de devis').toBeTruthy();
  const action = new URL(form!.match(/action="([^"]+)"/)![1], 'http://127.0.0.1:3100').pathname;
  expect(action).toBe('/api/public/leads');
  const siteId = form!.match(/name="site" value="([^"]+)"/)![1];
  expect(siteId).toBe(state.siteProjectId);
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    const [{ count: before }] = await sql<{ count: string }[]>`select count(*)::text as count from leads where project_id = ${state.siteProjectId}`;
    const response = await request.post(action, {
      headers: { host, origin: `https://${host}` },
      multipart: { site: siteId, kind: 'contact', nom: 'Visiteur du sous-domaine', email: 'visiteur@e2e.test', telephone: '', message: 'Bonjour, ceci vient du site publié.' },
    });
    expect(response.status(), await response.text()).toBe(200);
    expect(await response.text()).toContain('Merci');
    const [{ count: after }] = await sql<{ count: string }[]>`select count(*)::text as count from leads where project_id = ${state.siteProjectId}`;
    expect(Number(after)).toBe(Number(before) + 1);
  } finally { await sql.end(); }
});

test('M2 depuis le nom d’hôte d’un site, une demande pour un autre site ou invalide est refusée proprement', async ({ request, browser }) => {
  const slug = await publish(browser, state.siteProjectId);
  const host = `${slug}.${DOMAIN}`;
  const unknown = await request.post('/api/public/leads', { headers: { host }, multipart: { site: '00000000-0000-4000-8000-000000000000', kind: 'contact', nom: 'X', email: 'x@e2e.test', message: 'Bonjour' } });
  expect(unknown.status()).toBe(404);
  const invalid = await request.post('/api/public/leads', { headers: { host }, multipart: { site: state.siteProjectId, kind: 'contact', nom: '', email: 'pas-un-email', message: '' } });
  expect(invalid.status()).toBe(422);
});

test('M3 les routes publiques répondent aux pré-requêtes CORS (leads, rendez-vous, commandes)', async ({ request }) => {
  for (const path of ['/api/public/leads', '/api/public/bookings', '/api/public/orders']) {
    const response = await request.fetch(path, { method: 'OPTIONS', headers: { origin: `https://exemple.sites.${DOMAIN}`, 'access-control-request-method': 'POST' } });
    expect(response.status(), path).toBe(204);
    expect(response.headers()['access-control-allow-origin'], path).toBe('*');
  }
});
