import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import { auditPage } from './design-audit';
import { createOnboardingUser, fillMissingFields, previewFrame, previewSrcdoc, waitForPreview } from './helpers';

// Lot 5 avec la VRAIE IA (modèle de design Anthropic, vraie recherche d'entreprise, vraies photos), sans AI_MOCK :
// SIRET → demande « Je veux un site chaleureux avec prise de commande en ligne » → Studio avec le site créé.
// Lancer : npm run test:e2e:real -- phase-q-lot-5-real (serveur de développement sur le port 3000).
const SIRET = '91285838800024'; // TOUZALIN BOULANGERIE, La Rochelle (entreprise réelle, base Sirene)
const REQUEST = 'Je veux un site chaleureux avec prise de commande en ligne';
const REAL_TIMEOUT = 240_000;

test('Q5.R SIRET → demande → Studio : un site structuré, avec photos et modules adaptés au métier, créé par la vraie IA', async ({ page, context }) => {
  test.setTimeout(REAL_TIMEOUT + 120_000);
  const { email } = await createOnboardingUser(context);

  // Étape 1 : SIRET.
  await page.goto('/onboarding/siret');
  await page.locator('#siret').fill(SIRET);
  await page.getByRole('button', { name: 'Rechercher mon entreprise' }).click();
  // Étape 2 : confirmation des informations trouvées.
  await expect(page.getByRole('heading', { name: 'Vérifiez les informations de votre entreprise' })).toBeVisible();
  await expect(page.locator('input[value="TOUZALIN BOULANGERIE"]')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmer et continuer' }).click();
  // Étape 3 : coordonnées.
  await fillMissingFields(page);
  // Étape 4 : la demande, avec le premier exemple cliquable.
  await expect(page.getByRole('heading', { name: 'Décrivez le site que vous voulez' })).toBeVisible();
  await page.getByRole('button', { name: REQUEST }).click();
  await expect(page.getByLabel('Votre demande')).toHaveValue(REQUEST);
  await page.getByRole('button', { name: 'Créer mon site' }).click();
  await expect(page.getByRole('status')).toContainText('Nous créons votre site');
  await expect(page.getByRole('button', { name: 'Création en cours…' })).toBeDisabled();

  // Le Studio s'ouvre sur le site créé.
  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}\/preview$/, { timeout: REAL_TIMEOUT });
  const projectId = page.url().match(/studio\/([0-9a-f-]{36})\//)![1];
  await waitForPreview(page, (srcdoc) => srcdoc.startsWith('<!doctype html>') && srcdoc.includes('data-style='), 'site structuré chargé');
  const srcdoc = (await previewSrcdoc(page))!;
  await expect(previewFrame(page).locator('.brand').first()).toContainText(/touzalin/i);
  expect(srcdoc).not.toContain('{{company.');
  expect(srcdoc).not.toContain('<script');
  expect(srcdoc.toLowerCase()).not.toMatch(/lorem ipsum|nom du service|texte à venir/);

  // Preuves en base : description structurée, génération réelle, photos, modules.
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    const [site] = await sql<{ content: string }[]>`select b.content from project_files f join file_blobs b on b.hash = f.hash where f.project_id = ${projectId} and f.path = 'site.json'`;
    expect(site, 'site.json enregistré avec le projet').toBeTruthy();
    const description = JSON.parse(site.content) as { theme: { style: string }; pages: { sections: { type: string; image?: { src?: string }; images?: unknown[] }[] }[]; modules?: Record<string, unknown> };
    const sections = description.pages.flatMap((p) => p.sections);
    console.log('Style :', description.theme.style, '| sections :', sections.map((s) => s.type).join(', '), '| modules :', Object.keys(description.modules ?? {}).join(', '));
    expect(sections.length).toBeGreaterThanOrEqual(6);
    // « Prise de commande en ligne » → module boutique (click & collect) avec produits réels du métier.
    expect(description.modules?.shop, 'module boutique pour la prise de commande').toBeTruthy();
    expect(sections.some((s) => s.type === 'module')).toBe(true);
    // Photos réelles dans le rendu.
    const photos = await previewFrame(page).locator('img[src*="images.unsplash.com"], img[src^="/photos/"]').count();
    expect(photos, 'photos réelles dans l’aperçu').toBeGreaterThanOrEqual(3);
    expect(await previewFrame(page).locator('img:not([alt]), img[alt=""]').count()).toBe(0);

    const generations = await sql<{ task: string; provider: string; model: string; status: string; attempts: number; cost: number; project_id: string }[]>`select task, provider, model, status, attempts, shadow_cost_eur::float as cost, project_id from site_generations where project_id = ${projectId}`;
    console.log('Génération réelle :', JSON.stringify(generations));
    expect(generations).toHaveLength(1);
    expect(generations[0]).toMatchObject({ task: 'create', provider: 'anthropic', status: 'succeeded' });
    expect(generations[0].model).toMatch(/^claude-/);
    expect(generations[0].cost).toBeGreaterThan(0);
    expect(generations[0].cost).toBeLessThan(0.1);

    const [company] = await sql<{ siret: string }[]>`select c.siret from companies c join workspace_members m on m.workspace_id = c.workspace_id join users u on u.id = m.user_id where u.email = ${email}`;
    expect(company.siret).toBe(SIRET);
    const [debit] = await sql<{ n: number }[]>`select count(*)::int as n from credit_ledger l join workspace_members m on m.workspace_id = l.workspace_id join users u on u.id = m.user_id where u.email = ${email} and l.reason = 'site_creation'`;
    expect(debit.n).toBe(1);
  } finally {
    await sql.end();
  }

  // Lisibilité mesurée dans un vrai navigateur, ordinateur et mobile.
  const audit = await context.newPage();
  await audit.route('**/__apercu', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: srcdoc }));
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await audit.setViewportSize(viewport);
    await audit.goto('/__apercu');
    const result = await auditPage(audit);
    expect(result.contrast, `contraste ${viewport.width}px`).toEqual([]);
    expect(result.overflow, `débordement ${viewport.width}px`).toBe(0);
    expect(result.h1Count).toBe(1);
  }
  await page.screenshot({ path: 'docs/screenshots/phase-q-lot5/studio.png' });
});
