import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import { authCookies, readState, withCompleteCompliance } from './helpers';

// Routage par nom d'hôte (en-tête Host simulé : le Codespace ne gère pas les sous-domaines). Sans IA, sans Vercel.
const state = readState();
const DOMAIN = 'sites.mihoji.test';
test.describe.configure({ mode: 'serial' });

let slug = '';

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' });
  await context.addCookies(authCookies());
  await withCompleteCompliance(state.workspaceId, async () => {
    const response = await context.request.post(`/api/projects/${state.siteProjectId}/publish`);
    expect(response.status(), await response.text()).toBe(200);
    slug = (JSON.parse(await response.text()) as { subdomain: string }).subdomain;
  });
  await context.close();
});

test('R1 <sous-domaine>.<domaine des sites> sert la version publiée du site, avec sa feuille de style', async ({ request }) => {
  const host = `${slug}.${DOMAIN}`;
  const page = await request.get('/', { headers: { host } });
  expect(page.status()).toBe(200);
  expect(page.headers()['content-type']).toContain('text/html');
  const html = await page.text();
  expect(html).toContain('Boulangerie E2E');
  expect(html).not.toContain('{{');
  expect(html).not.toContain('<script');
  const css = await request.get('/styles.css', { headers: { host } });
  expect(css.status()).toBe(200);
  expect(css.headers()['content-type']).toContain('text/css');
  expect(page.headers()['content-security-policy']).toContain("script-src 'none'");
  expect((await request.get('/page-qui-n-existe-pas', { headers: { host } })).status()).toBe(404);
});

test('R2 le site publié est la copie figée : modifier ensuite l’entreprise ne change pas le site en ligne', async ({ request }) => {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const [before] = await sql<{ name: string }[]>`select name from companies where workspace_id = ${state.workspaceId}`;
  try {
    await sql`update companies set name = 'Nom modifié après publication' where workspace_id = ${state.workspaceId}`;
    const html = await (await request.get('/', { headers: { host: `${slug}.${DOMAIN}` } })).text();
    expect(html).toContain('Boulangerie E2E');
    expect(html).not.toContain('Nom modifié après publication');
  } finally {
    await sql`update companies set name = ${before.name} where workspace_id = ${state.workspaceId}`;
    await sql.end();
  }
});

test('R3 l’hôte principal de l’application garde son comportement', async ({ request }) => {
  const home = await request.get('/');
  expect(home.status()).toBe(200);
  expect(await home.text()).toContain('Mihoji');
  const asSitesRoot = await request.get('/', { headers: { host: DOMAIN } });
  expect(asSitesRoot.status()).toBe(200);
  expect(await asSitesRoot.text()).toContain('Mihoji'); // la racine du domaine des sites est l'application
  expect((await request.get('/login')).status()).toBe(200); // les pages de l'application restent servies sur son hôte
  expect((await request.get('/studio', { maxRedirects: 0 })).status()).toBeGreaterThanOrEqual(300); // et protégées comme avant
});

test('R4 un nom d’hôte inconnu ou invalide renvoie une page « introuvable » propre', async ({ request }) => {
  for (const host of [`aucun-site-ici.${DOMAIN}`, `a.b.${DOMAIN}`, 'www.domaine-inconnu.test']) {
    const response = await request.get('/', { headers: { host } });
    expect(response.status(), host).toBe(404);
    expect(await response.text()).toContain('Page introuvable');
    expect(response.headers()['x-robots-tag']).toContain('noindex');
  }
});

test('R5 sur le nom d’hôte d’un site, ni le Studio ni l’API privée ne sont accessibles', async ({ request }) => {
  const host = `${slug}.${DOMAIN}`;
  for (const path of ['/studio', `/studio/${state.siteProjectId}/preview`, `/api/projects/${state.siteProjectId}/publish`, '/admin', '/login', '/api/admin']) {
    const response = await request.get(path, { headers: { host }, maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
  }
  // En revanche, les formulaires, photos et polices de l'application restent joignables depuis le site.
  const options = await request.fetch('/api/public/leads', { method: 'OPTIONS', headers: { host } });
  expect(options.status()).toBeLessThan(300);
});

test('R6 accès de test par chemin en développement : /_site/<sous-domaine>', async ({ request }) => {
  const page = await request.get(`/_site/${slug}`);
  expect(page.status()).toBe(200);
  const html = await page.text();
  expect(html).toContain('Boulangerie E2E');
  expect(html).toContain(`<base href="/_site/${slug}/">`); // les liens relatifs et la feuille de style se résolvent sous le chemin de test
  expect((await request.get(`/_site/${slug}/styles.css`)).status()).toBe(200);
  expect((await request.get('/_site/inconnu')).status()).toBe(404);
});
