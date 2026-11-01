import { expect, test } from '@playwright/test';
import { lastAssistantMessage, login, previewFrame, previewSrcdoc, readState, sendChat, versionCount, waitForPreview } from './helpers';

const state = readState();
const projectId = state.qualityProjectId;

test('0.1 « titres en bleu » : l’essai défectueux est annulé, le bloc Horaires reste intact et le titre du bandeau reste lisible', async ({ page, context }) => {
  await login(page, context, projectId);
  const before = await versionCount(page, projectId);
  await sendChat(page, 'Change la couleur des titres en bleu foncé');
  // Le premier essai (balise « </h2<p » tronquée) est refusé par les contrôles, le second est appliqué.
  await expect(lastAssistantMessage(page)).toContainText('J’ai mis les titres en bleu foncé.', { timeout: 30_000 });
  await expect(lastAssistantMessage(page)).toContainText('assez lisible');
  await waitForPreview(page, (srcdoc) => srcdoc.includes('text-blue-900'), 'titres en bleu');
  const srcdoc = (await previewSrcdoc(page))!;
  expect(srcdoc).toContain('<h1 class="mt-4 text-4xl font-bold text-white">');
  expect(srcdoc).toContain('<h2 class="text-2xl font-bold text-blue-900">Horaires</h2>');
  expect(srcdoc).not.toContain('</h2<');
  const horaires = previewFrame(page).locator('[data-mihoji="horaires"]');
  await expect(horaires.locator('> h2')).toHaveText('Horaires');
  await expect(horaires.locator('> p')).toHaveText('Du lundi au vendredi, de 8h à 18h.');
  await expect(page.locator('aside')).not.toContainText('```');
  await expect(page.locator('aside')).not.toContainText('className');
  // Une seule version créée : l’essai annulé n’a rien enregistré.
  expect(await versionCount(page, projectId)).toBe(before + 1);
});

test('0.2 si les deux essais cassent une autre section, rien n’est modifié et la réponse est honnête', async ({ page, context }) => {
  await login(page, context, projectId);
  const before = await versionCount(page, projectId);
  await waitForPreview(page, (srcdoc) => srcdoc.includes('Horaires'), 'chargement du projet');
  const initial = await previewSrcdoc(page);
  await sendChat(page, 'Mets les titres en bleu, modèle maladroit');
  await expect(lastAssistantMessage(page)).toContainText('Je n’ai rien modifié', { timeout: 30_000 });
  expect(await versionCount(page, projectId)).toBe(before);
  expect(await previewSrcdoc(page)).toBe(initial);
});

test('0.3 une demande échouée n’est pas renvoyée au modèle dans les générations suivantes', async ({ page, context }) => {
  await login(page, context, projectId);
  await sendChat(page, 'Raconte-moi une blague');
  await expect(lastAssistantMessage(page)).toContainText('Je n’ai pas pu appliquer cette modification', { timeout: 30_000 });
  const bodies: { messages: { role: string; content: string }[] }[] = [];
  await page.route('**/api/generate', async (route) => {
    bodies.push(route.request().postDataJSON() as { messages: { role: string; content: string }[] });
    await route.continue();
  });
  await sendChat(page, 'Change la couleur des titres en bleu');
  await expect(lastAssistantMessage(page)).toContainText('J’ai mis les titres en bleu', { timeout: 30_000 });
  expect(bodies).toHaveLength(1);
  const sent = bodies[0].messages.map((message) => message.content).join('\n');
  expect(sent).not.toContain('blague');
  expect(sent).not.toContain('Je n’ai pas pu appliquer');
  expect(bodies[0].messages.at(-1)?.content).toBe('Change la couleur des titres en bleu');
});
