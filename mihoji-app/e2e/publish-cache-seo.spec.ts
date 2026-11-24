import { expect, test, type Browser } from '@playwright/test';
import postgres from 'postgres';
import { authCookies, readState, withCompleteCompliance } from './helpers';

// Performance et référencement des sites publiés : pages en cache (aucun rendu à chaque visite), cache invalidé à la publication,
// robots.txt, plan du site et balise canonique propres à chaque site. Sans IA, sans Vercel.
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

let slugA = '';
let slugB = '';
test.beforeAll(async ({ browser }) => { slugA = await publish(browser, state.siteProjectId); slugB = await publish(browser, state.projectId); });

test('C1 chaque site a son robots.txt, son plan du site et sa balise canonique sur sa propre adresse', async ({ request }) => {
  expect(slugA).not.toBe(slugB);
  for (const slug of [slugA, slugB]) {
    const host = `${slug}.${DOMAIN}`;
    const origin = `https://${host}`;
    const robots = await request.get('/robots.txt', { headers: { host } });
    expect(robots.status()).toBe(200);
    expect(robots.headers()['content-type']).toContain('text/plain');
    expect(await robots.text()).toContain(`Sitemap: ${origin}/sitemap.xml`);
    const sitemap = await request.get('/sitemap.xml', { headers: { host } });
    expect(sitemap.status()).toBe(200);
    expect(sitemap.headers()['content-type']).toContain('xml');
    const xml = await sitemap.text();
    expect(xml).toContain(`<loc>${origin}/</loc>`);
    expect(xml).not.toContain(`https://${slug === slugA ? slugB : slugA}.${DOMAIN}`);
    const html = await (await request.get('/', { headers: { host } })).text();
    expect(html).toContain(`<link rel="canonical" href="${origin}/">`);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
  }
});

test('C2 les pages publiées sont en cache : une visite ne déclenche aucun nouveau rendu, et la publication les invalide', async ({ request, browser }) => {
  const host = `${slugA}.${DOMAIN}`;
  const first = await request.get('/', { headers: { host } });
  expect(first.headers()['cache-control']).toContain('s-maxage');
  expect(await first.text()).toContain('Boulangerie E2E');
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    // La copie en base change SANS passer par la publication : tant que le cache n'est pas invalidé, les visiteurs reçoivent la page en cache (pas de rendu ni de lecture à chaque visite).
    await sql`update published_sites set snapshot = jsonb_set(snapshot, '{company,name}', '"Nom visible seulement apres invalidation"') where subdomain = ${slugA}`;
    const cached = await (await request.get('/', { headers: { host } })).text();
    expect(cached).toContain('Boulangerie E2E');
    expect(cached).not.toContain('Nom visible seulement apres invalidation');
    // Dépublier invalide l'étiquette du site : la page « indisponible » apparaît tout de suite.
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' });
    await context.addCookies(authCookies());
    expect((await context.request.delete(`/api/projects/${state.siteProjectId}/publish`)).status()).toBe(200);
    await context.close();
    expect((await request.get('/', { headers: { host } })).status()).toBe(503);
    // Republier : copie recalculée depuis le projet, cache invalidé, le site revient avec son contenu.
    expect(await publish(browser, state.siteProjectId)).toBe(slugA);
    const fresh = await request.get('/', { headers: { host } });
    expect(fresh.status()).toBe(200);
    expect(await fresh.text()).toContain('Boulangerie E2E');
  } finally { await sql.end(); }
});

test('C3 renommer le sous-domaine invalide l’ancienne adresse et sert la nouvelle', async ({ request, browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' });
  await context.addCookies(authCookies());
  const next = `renomme-${Date.now().toString(36)}`;
  const oldHost = `${slugB}.${DOMAIN}`;
  expect((await request.get('/', { headers: { host: oldHost } })).status()).toBe(200);
  expect((await context.request.put(`/api/projects/${state.projectId}/site-address`, { data: { subdomain: next } })).status()).toBe(200);
  await context.close();
  expect((await request.get('/', { headers: { host: oldHost } })).status()).toBe(404);
  const renamed = await request.get('/', { headers: { host: `${next}.${DOMAIN}` } });
  expect(renamed.status()).toBe(200);
  expect(await renamed.text()).toContain(`<link rel="canonical" href="https://${next}.${DOMAIN}/">`);
});
