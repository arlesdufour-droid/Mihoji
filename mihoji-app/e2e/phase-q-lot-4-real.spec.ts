import { expect, test, type Page } from '@playwright/test';
import postgres from 'postgres';
import { auditPage } from './design-audit';
import { lastAssistantMessage, login, previewFrame, previewSrcdoc, readState, sendChat, versionCount, waitForPreview } from './helpers';

// Lot 4 avec la VRAIE IA (modèle de design Anthropic, sans AI_MOCK) : deux demandes envoyées dans le chat du Studio,
// puis vérification de l'aperçu. Lancer : npm run test:e2e:real (serveur de développement sur le port 3000).
const state = readState();
const REAL_TIMEOUT = 150_000;

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

test('Q4.R deux demandes réelles dans le chat : une FAQ ajoutée, puis un style premium, le reste du site intact et lisible', async ({ page, context }) => {
  test.setTimeout(REAL_TIMEOUT * 2 + 60_000);
  const projectId = state.siteProjectId;
  await login(page, context, projectId);
  await waitForPreview(page, (srcdoc) => srcdoc.startsWith('<!doctype html>') && srcdoc.includes('data-style="artisan"'), 'site structuré chargé');
  const before = await sectionTexts(page);
  const versionsBefore = await versionCount(page, projectId);

  // Demande 1 : ajout d'une section.
  await sendChat(page, 'Ajoute une section de questions fréquentes (FAQ) avec 3 questions sur les commandes à l’avance et le retrait en boutique.');
  await waitForPreview(page, (srcdoc) => srcdoc.includes('id="faq"'), 'section FAQ ajoutée', REAL_TIMEOUT);
  await expect(lastAssistantMessage(page)).toBeVisible({ timeout: REAL_TIMEOUT });
  const questions = await previewFrame(page).locator('#faq details summary').allInnerTexts();
  expect(questions.length).toBeGreaterThanOrEqual(3);
  const afterFaq = await sectionTexts(page);
  for (const [id, text] of Object.entries(before)) expect(afterFaq[id], `la section « ${id} » ne doit pas changer`).toBe(text);
  expect(await versionCount(page, projectId)).toBe(versionsBefore + 1);

  // Demande 2 : changement d'apparence, sans toucher aux textes.
  await sendChat(page, 'Passe le site au style Élégant premium.');
  await waitForPreview(page, (srcdoc) => srcdoc.includes('data-style="premium"'), 'style Élégant premium', REAL_TIMEOUT);
  expect(await sectionTexts(page)).toEqual(afterFaq);
  expect(await versionCount(page, projectId)).toBe(versionsBefore + 2);
  const message = (await lastAssistantMessage(page).textContent()) ?? '';
  expect(message.length).toBeGreaterThan(10);
  for (const marker of ['```', '<section', '</', 'className', '{', '}', '.json', '.html']) expect(message, `pas de « ${marker} » dans la réponse`).not.toContain(marker);

  // Preuve que la vraie IA a répondu : le journal des générations enregistre le fournisseur, le modèle et le coût réel de chaque demande.
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const generations = await sql<{ provider: string; model: string; status: string; attempts: number; cost: number }[]>`select provider, model, status, attempts, shadow_cost_eur::float as cost from site_generations where project_id = ${projectId} and task = 'edit' order by created_at`;
  await sql.end();
  console.log('Générations réelles :', JSON.stringify(generations));
  expect(generations).toHaveLength(2);
  for (const generation of generations) {
    expect(generation.provider).toBe('anthropic');
    expect(generation.model).toMatch(/^claude-/);
    expect(generation.status).toBe('succeeded');
    expect(generation.cost).toBeGreaterThan(0);
    expect(generation.cost).toBeLessThan(0.1);
  }

  // Lisibilité mesurée dans un vrai navigateur sur l'aperçu final, ordinateur et mobile.
  const srcdoc = (await previewSrcdoc(page))!;
  const audit = await context.newPage();
  await audit.route('**/__apercu', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: srcdoc }));
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await audit.setViewportSize(viewport);
    await audit.goto('/__apercu');
    const result = await auditPage(audit);
    expect(result.contrast, `contraste ${viewport.width}px`).toEqual([]);
    expect(result.overflow, `débordement ${viewport.width}px`).toBe(0);
    expect(result.imagesWithoutAlt).toBe(0);
    expect(result.h1Count).toBe(1);
  }
});
