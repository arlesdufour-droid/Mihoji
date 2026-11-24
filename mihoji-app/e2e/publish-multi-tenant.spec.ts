import { expect, test } from '@playwright/test';
import { authCookies, readState, withCompleteCompliance } from './helpers';

// Publication multi-tenant (sans IA, sans déploiement, sans appel à Vercel) : sous-domaine unique par site publié.
const state = readState();
test.describe.configure({ mode: 'serial' });

test('P1 la première publication donne un sous-domaine dérivé du nom de l’entreprise, gardé aux publications suivantes', async ({ page, context }) => withCompleteCompliance(state.workspaceId, async () => {
  await context.addCookies(authCookies());
  const first = await page.request.post(`/api/projects/${state.siteProjectId}/publish`);
  expect(first.status(), await first.text()).toBe(200);
  const published = JSON.parse(await first.text()) as { url: string; subdomain: string };
  expect(published.subdomain).toMatch(/^boulangerie-e2e(-\d+)?$/);
  expect(published.url).toContain(`/_site/${published.subdomain}/`); // en développement : accès de test par chemin
  const again = await (await page.request.post(`/api/projects/${state.siteProjectId}/publish`)).json() as { subdomain: string };
  expect(again.subdomain).toBe(published.subdomain);
  const info = await (await page.request.get(`/api/projects/${state.siteProjectId}/site-address`)).json() as { published: boolean; subdomain: string; status: string };
  expect(info).toMatchObject({ published: true, subdomain: published.subdomain, status: 'live' });
  expect(await (await page.request.get(`/api/projects/${state.projectId}/site-address`)).json()).toEqual({ published: false });
}));

test('P2 l’adresse est modifiable, unique, et refuse les mots réservés et les formes invalides', async ({ page, context }) => withCompleteCompliance(state.workspaceId, async () => {
  await context.addCookies(authCookies());
  const mine = (await (await page.request.get(`/api/projects/${state.siteProjectId}/site-address`)).json() as { subdomain: string }).subdomain;
  // Deuxième site de la même entreprise : même nom → adresse suffixée, jamais la même.
  const secondResponse = await page.request.post(`/api/projects/${state.projectId}/publish`);
  expect(secondResponse.status(), await secondResponse.text()).toBe(200);
  const second = await secondResponse.json() as { subdomain: string };
  expect(second.subdomain).not.toBe(mine);
  const put = (projectId: string, subdomain: string) => page.request.put(`/api/projects/${projectId}/site-address`, { data: { subdomain } });
  for (const word of ['www', 'app', 'admin', 'api']) {
    const response = await put(state.projectId, word);
    expect(response.status(), word).toBe(422);
    expect((await response.json() as { error: string }).error).toBe('reserve');
  }
  expect((await (await put(state.projectId, 'ab')).json() as { error: string }).error).toBe('trop_court');
  expect((await (await put(state.projectId, 'Mauvais_Nom')).json() as { error: string }).error).toBe('caracteres');
  expect((await (await put(state.projectId, '-debut')).json() as { error: string }).error).toBe('tirets');
  const taken = await put(state.projectId, mine);
  expect(taken.status()).toBe(409);
  expect((await taken.json() as { message: string }).message).toContain('déjà prise');
  const renamed = await put(state.projectId, `e2e-${Date.now().toString(36)}`);
  expect(renamed.status()).toBe(200);
  const body = await renamed.json() as { subdomain: string; url: string };
  expect(body.url).toContain(`/_site/${body.subdomain}/`);
  expect((await put(state.legacyProjectId, 'quelque-chose')).status()).toBe(404); // jamais publié
}));

test('P3 sans session, ni la publication ni l’adresse ne sont accessibles', async ({ request }) => {
  expect((await request.post(`/api/projects/${state.siteProjectId}/publish`)).status()).toBe(401);
  expect((await request.put(`/api/projects/${state.siteProjectId}/site-address`, { data: { subdomain: 'pirate' } })).status()).toBe(401);
  expect((await request.get(`/api/projects/${state.siteProjectId}/site-address`)).status()).toBe(401);
});
