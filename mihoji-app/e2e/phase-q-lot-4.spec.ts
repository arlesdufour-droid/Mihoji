import { expect, test, type Page } from '@playwright/test';
import { lastAssistantMessage, login, previewFrame, previewSrcdoc, readState, sendChat, versionCount, waitForPreview } from './helpers';

// Lot 4 en simulation (AI_MOCK=1) : le parcours est celui de l'interface, le « modèle » est déterministe.
// Le même parcours avec la vraie IA est dans phase-q-lot-4-real.spec.ts.
const state = readState();

async function sectionTexts(page: Page): Promise<Record<string, string>> {
  const sections = previewFrame(page).locator('.s');
  const count = await sections.count();
  const out: Record<string, string> = {};
  for (let i = 0; i < count; i += 1) {
    const id = await sections.nth(i).getAttribute('id');
    out[id ?? `s${i}`] = (await sections.nth(i).innerText()).replace(/\s+/g, ' ').trim().toLowerCase(); // la casse dépend du style (majuscules du style premium)
  }
  return out;
}

async function latestSnapshot(page: Page, projectId: string): Promise<Record<string, string>> {
  const versions = await (await page.request.get(`/api/projects/${projectId}/versions`)).json() as { filesSnapshot: Record<string, string> }[];
  return versions[0].filesSnapshot;
}

test('Q4.1 le chat modifie la description du site : une section ajoutée, puis un nouveau style, sans toucher au reste', async ({ page, context }) => {
  test.setTimeout(120_000);
  const projectId = state.siteProjectId;
  await login(page, context, projectId);
  await waitForPreview(page, (srcdoc) => srcdoc.startsWith('<!doctype html>') && srcdoc.includes('data-style="artisan"'), 'site structuré chargé');
  await expect(previewFrame(page).locator('.brand').first()).toHaveText('Boulangerie E2E');
  const before = await sectionTexts(page);
  const versionsBefore = await versionCount(page, projectId);
  expect(Object.keys(await latestSnapshot(page, projectId))).toContain('site.json');

  await sendChat(page, 'Ajoute une FAQ');
  await waitForPreview(page, (srcdoc) => srcdoc.includes('id="faq"'), 'section FAQ ajoutée');
  await expect(previewFrame(page).locator('#faq details')).toHaveCount(3);
  await expect(lastAssistantMessage(page)).toContainText('questions fréquentes');
  const afterFaq = await sectionTexts(page);
  for (const [id, text] of Object.entries(before)) expect(afterFaq[id], `la section « ${id} » ne doit pas changer`).toBe(text);
  expect(await versionCount(page, projectId)).toBe(versionsBefore + 1);

  await sendChat(page, 'Passe le site au style Élégant premium');
  await waitForPreview(page, (srcdoc) => srcdoc.includes('data-style="premium"'), 'style Élégant premium');
  const afterStyle = await sectionTexts(page);
  expect(afterStyle).toEqual(afterFaq);
  expect(await versionCount(page, projectId)).toBe(versionsBefore + 2);
  for (const marker of ['```', '<section', '</', 'className', '{', '}']) expect(await lastAssistantMessage(page).textContent()).not.toContain(marker);
  // Le HTML n'a pas été écrit à la main : site.json et index.html sont enregistrés ensemble, dans la même version.
  expect(Object.keys(await latestSnapshot(page, projectId)).sort()).toEqual(['index.html', 'site.json']);
});

test('Q4.2 un essai défectueux est annulé : le site n’est modifié qu’une fois, par l’essai valide', async ({ page, context }) => {
  test.setTimeout(120_000);
  const projectId = state.siteProjectId;
  await login(page, context, projectId);
  await waitForPreview(page, (srcdoc) => srcdoc.startsWith('<!doctype html>'), 'site structuré chargé');
  const versionsBefore = await versionCount(page, projectId);
  const staleSrcdoc = await previewSrcdoc(page);
  await sendChat(page, 'Change le titre (version maladroite)');
  await waitForPreview(page, (srcdoc) => srcdoc !== staleSrcdoc && srcdoc.includes('Le pain du quartier, chaque matin'), 'titre modifié après nouvel essai');
  expect(await previewSrcdoc(page)).not.toMatch(/lorem ipsum/i);
  await expect(previewFrame(page).locator('h1')).toHaveText('Le pain du quartier, chaque matin');
  expect(await versionCount(page, projectId)).toBe(versionsBefore + 1);
});

test('Q4.3 une demande qui ne modifie pas le site ne crée aucune version', async ({ page, context }) => {
  const projectId = state.siteProjectId;
  await login(page, context, projectId);
  await waitForPreview(page, (srcdoc) => srcdoc.startsWith('<!doctype html>'), 'site structuré chargé');
  const versionsBefore = await versionCount(page, projectId);
  await sendChat(page, 'Merci beaucoup, c’est très bien !');
  await expect(lastAssistantMessage(page)).toContainText('préciser');
  expect(await versionCount(page, projectId)).toBe(versionsBefore);
});

test('Q4.4 la migration d’un ancien projet recrée le site sans perdre ni l’historique ni le chat', async ({ page, context }) => {
  test.setTimeout(120_000);
  const projectId = state.legacyProjectId;
  await login(page, context, projectId);
  await waitForPreview(page, (srcdoc) => srcdoc.includes('Boulangerie E2E') && !srcdoc.includes('data-style='), 'ancien projet (HTML)');
  const versionsBefore = await versionCount(page, projectId);
  const chatBefore = await (await page.request.get(`/api/projects/${projectId}/chat`)).json() as unknown[];

  const migrated = await page.request.post('/api/admin/migrate-project', { data: { projectId } });
  expect(migrated.ok()).toBe(true);
  expect(((await migrated.json()) as { status: string }).status).toBe('migrated');
  expect(((await (await page.request.post('/api/admin/migrate-project', { data: { projectId } })).json()) as { status: string }).status).toBe('already');

  await page.reload();
  await waitForPreview(page, (srcdoc) => srcdoc.startsWith('<!doctype html>') && srcdoc.includes('data-style='), 'projet migré');
  await expect(previewFrame(page).locator('.brand').first()).toHaveText('Boulangerie E2E');
  expect(await versionCount(page, projectId)).toBe(versionsBefore + 1);
  const chatAfter = await (await page.request.get(`/api/projects/${projectId}/chat`)).json() as unknown[];
  expect(chatAfter.slice(0, chatBefore.length)).toEqual(chatBefore);

  // L'ancienne version reste là : la restaurer rend le HTML d'origine et retire la description structurée.
  const versions = await (await page.request.get(`/api/projects/${projectId}/versions`)).json() as { id: string; summary: string }[];
  const original = versions.find((version) => version.summary === 'Version legacy');
  expect(original).toBeTruthy();
  const restored = await page.request.post(`/api/projects/${projectId}/versions`, { data: { versionId: original!.id } });
  expect(restored.ok()).toBe(true);
  await page.reload();
  await waitForPreview(page, (srcdoc) => srcdoc.includes('Boulangerie E2E') && !srcdoc.includes('data-style='), 'ancienne version restaurée');
  expect(Object.keys(await latestSnapshot(page, projectId))).toEqual(['index.html']);
});
