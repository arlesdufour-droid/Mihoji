import { expect, test } from '@playwright/test';
import { contrastIssues } from '../src/lib/engine/contrast';
import { lastAssistantMessage, login, previewFrame, previewSrcdoc, readState, sendChat, versionCount, waitForPreview } from './helpers';

// Parcours EXACT de l'interface avec la vraie clé Groq (pas de AI_MOCK) :
// ouvrir le Studio, envoyer une demande dans le chat, vérifier que l'aperçu change
// et que la réponse affichée en mode simple ne contient jamais de code.

const state = readState();
const REAL_TIMEOUT = 90_000;

async function expectNoCode(message: ReturnType<typeof lastAssistantMessage>) {
  await expect(message).toBeVisible({ timeout: REAL_TIMEOUT });
  const text = await message.textContent();
  expect(text).toBeTruthy();
  for (const marker of ['```', '<section', '<div', '</', 'className', 'color:', '{', '}', '.tsx', '.html', 'Bon codage']) {
    expect(text, `la réponse ne doit pas contenir « ${marker} »`).not.toContain(marker);
  }
}

test('le chat du Studio modifie réellement le site avec la vraie clé Groq, sans code visible', async ({ page, context }) => {
  await login(page, context);
  await waitForPreview(page, (srcdoc) => srcdoc.includes('Boulangerie E2E'), 'chargement initial', REAL_TIMEOUT);

  await sendChat(page, 'Ajoute une section Nos spécialités avec 3 pains');
  await waitForPreview(page, (srcdoc) => /spécialit/i.test(srcdoc), 'section Nos spécialités ajoutée', REAL_TIMEOUT);
  await expectNoCode(lastAssistantMessage(page));
  const afterSpecialites = await previewSrcdoc(page);
  // Cohérence métier : une liste de « pains » ne contient pas de viennoiserie.
  expect.soft(afterSpecialites, 'pas de croissant dans une liste de pains').not.toMatch(/croissant/i);

  await sendChat(page, 'Change la couleur des titres en bleu foncé');
  await waitForPreview(page, (srcdoc) => srcdoc !== afterSpecialites && /<h[12][^>]*(?:text-(?:blue|indigo|sky|cyan)-[6-9]00|#[0-9a-f]{6})/i.test(srcdoc), 'titres en bleu foncé', REAL_TIMEOUT);
  await expectNoCode(lastAssistantMessage(page));
});

test('lot 0 : « titres en bleu » avec la vraie clé ne casse pas le bloc Horaires et garde le bandeau lisible', async ({ page, context }) => {
  const projectId = state.qualityProjectId;
  await login(page, context, projectId);
  await waitForPreview(page, (srcdoc) => srcdoc.includes('Horaires'), 'chargement du projet qualité', REAL_TIMEOUT);
  const before = await versionCount(page, projectId);

  await sendChat(page, 'Change la couleur des titres en bleu foncé');
  await waitForPreview(page, (srcdoc) => srcdoc.includes('Horaires') && /<h2[^>]*(?:text-(?:blue|indigo|sky|cyan)-[6-9]00|#[0-9a-f]{6})/i.test(srcdoc), 'titres h2 en bleu foncé', REAL_TIMEOUT);
  await expectNoCode(lastAssistantMessage(page));

  const srcdoc = (await previewSrcdoc(page))!;
  expect(srcdoc).not.toContain('</h2<');
  await expect(previewFrame(page).locator('h2', { hasText: 'Horaires' })).toHaveText('Horaires');
  await expect(previewFrame(page).locator('h2:has-text("Horaires") + p')).toHaveText('Du lundi au vendredi, de 8h à 18h.');
  await expect(previewFrame(page).getByText('Bienvenue chez Boulangerie E2E')).toBeVisible();
  // Lisibilité WCAG AA sur tout le site, y compris le titre du bandeau violet.
  expect(contrastIssues(srcdoc).map((issue) => `${issue.text} (${issue.ratio.toFixed(1)})`)).toEqual([]);
  expect(await versionCount(page, projectId)).toBe(before + 1);
});
