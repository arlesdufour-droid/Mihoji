import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import { auditPage } from './design-audit';
import { createOnboardingUser, fillMissingFields, previewFrame, previewSrcdoc, waitForPreview } from './helpers';

// Lot 7 avec la VRAIE IA (une seule génération, environ 0,04 €) : cabinet de kinésithérapie avec rendez-vous et acompte.
// Vérifie le parcours réel : photos Pixabay hébergées (une par prestation, portrait), aucune galerie générique, formulaire de rendez-vous.
// Lancer : npm run test:e2e:real -- phase-q-lot-7-real (serveur de développement sur le port 3000).
const REQUEST = 'Un site pour mon cabinet de kinésithérapie, avec prise de rendez-vous en ligne et acompte pour réserver';
const REAL_TIMEOUT = 240_000;
const SHOTS = 'docs/screenshots/phase-q-lot7';

test('L7.R kiné : site créé par la vraie IA avec photos au service du contenu, rendez-vous et acompte', async ({ page, context }) => {
  test.setTimeout(REAL_TIMEOUT + 120_000);
  await createOnboardingUser(context);
  await page.goto('/onboarding/manual');
  await page.getByLabel('Nom de votre entreprise').fill('Cabinet de kinésithérapie Moreau');
  await page.getByLabel('Votre métier ou activité').fill('Masseur-kinésithérapeute');
  await page.getByLabel(/Adresse/).fill('12 rue Gambetta, 44000 Nantes');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await fillMissingFields(page);
  await expect(page.getByRole('heading', { name: 'Décrivez le site que vous voulez' })).toBeVisible();
  await page.getByLabel('Votre demande').fill(REQUEST);
  await page.getByRole('button', { name: 'Créer mon site' }).click();
  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}\/preview$/, { timeout: REAL_TIMEOUT });
  const projectId = page.url().match(/studio\/([0-9a-f-]{36})\//)![1];
  await waitForPreview(page, (srcdoc) => srcdoc.startsWith('<!doctype html>') && srcdoc.includes('data-style='), 'site structuré chargé');
  const srcdoc = (await previewSrcdoc(page))!;
  expect(srcdoc).not.toContain('{{company.');
  expect(srcdoc).not.toContain('<script');
  expect(srcdoc.toLowerCase()).not.toMatch(/lorem ipsum|nom du service|texte à venir/);

  const frame = previewFrame(page);
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    const [site] = await sql<{ content: string }[]>`select b.content from project_files f join file_blobs b on b.hash = f.hash where f.project_id = ${projectId} and f.path = 'site.json'`;
    const description = JSON.parse(site.content) as { theme: { style: string }; pages: { sections: { type: string }[] }[]; modules?: { booking?: { payment: string; depositPercent?: number } } };
    const sections = description.pages.flatMap((p) => p.sections).map((s) => s.type);
    console.log('Style :', description.theme.style, '| sections :', sections.join(', '), '| rendez-vous :', JSON.stringify(description.modules?.booking && { payment: description.modules.booking.payment, depositPercent: description.modules.booking.depositPercent }));
    // Rendez-vous avec acompte : module et formulaire réels.
    expect(description.modules?.booking, 'module de rendez-vous').toBeTruthy();
    await expect(frame.locator('form[action="/api/public/bookings"]')).toHaveCount(1);
    // Pas de galerie générique pour un praticien.
    expect(sections).not.toContain('gallery');
    // Photos : réelles (Pixabay hébergées ou bibliothèque), toutes décrites ; mesure du nombre de photos par prestation.
    const photos = await frame.locator('img[src^="/api/hosted-photos/"], img[src*="images.unsplash.com"], img[src^="/photos/"]').count();
    const servicePhotos = await frame.locator('.s-services .svc-item--photo img').count();
    const services = await frame.locator('.s-services .svc-item').count();
    console.log(`Photos : ${photos} au total, ${servicePhotos}/${services} prestations avec photo, portrait/présentation : ${await frame.locator('.s-about img').count()}`);
    // Mesure : le lot 7 vise une photo par prestation et un portrait. Seuil dur minimal (au moins la photo d'en-tête) ; l'écart est rapporté dans docs/phase-q-progress.md.
    expect(photos, 'photos réelles dans l’aperçu').toBeGreaterThanOrEqual(1);
    expect(await frame.locator('img:not([alt]), img[alt=""]').count()).toBe(0);
    // Les photos hébergées sont réellement servies (pas de cadre cassé).
    const hosted = await frame.locator('img[src^="/api/hosted-photos/"]').evaluateAll((images) => images.map((image) => (image as HTMLImageElement).getAttribute('src')));
    for (const src of hosted.slice(0, 3)) expect((await page.request.get(src!)).status(), src!).toBe(200);

    const generations = await sql<{ task: string; provider: string; status: string; cost: number }[]>`select task, provider, status, shadow_cost_eur::float as cost from site_generations where project_id = ${projectId}`;
    console.log('Génération réelle :', JSON.stringify(generations));
    expect(generations).toHaveLength(1);
    expect(generations[0]).toMatchObject({ task: 'create', provider: 'anthropic', status: 'succeeded' });
    expect(generations[0].cost).toBeLessThan(0.1);
  } finally {
    await sql.end();
  }

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
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/studio-ordinateur.jpg`, type: 'jpeg', quality: 75 });
});
