import { expect, test } from '@playwright/test';
import { listKeptEntries } from '../src/lib/vitrine/store';

// Vitrine de la page d'accueil (sans IA, sans coût) : les sites d'exemple gardés dans /admin/vitrine, avec un aperçu visuel par carte, sur ordinateur et sur mobile,
// rendus par le moteur actuel (description structurée, fichiers du dépôt) avec la mention « entreprise fictive ».
const kept = listKeptEntries();
const short = (label: string) => label.replace(/ \(.*\)$/, '');

test('V1 l’accueil montre une carte par site gardé, avec l’aperçu visuel du site (ordinateur)', async ({ page }) => {
  expect(kept.length).toBeGreaterThanOrEqual(4);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Des sites pour tous les métiers' });
  await expect(section.locator('ul > li')).toHaveCount(kept.length);
  for (const entry of kept) {
    const card = section.getByRole('link', { name: new RegExp(short(entry.label)) });
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute('href', `/exemples/${entry.slug}`);
    await expect(card).toContainText('entreprise fictive');
    const image = card.getByRole('img', { name: `Aperçu du site d’exemple : ${short(entry.label)}` });
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
    expect(await image.evaluate((node: HTMLImageElement) => node.currentSrc)).toContain(`/vitrine/${entry.slug}/apercu-ordinateur.webp`);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await expect(page.locator('body')).not.toContainText(/🔧|🥖|🩺|💼/); // plus d'emoji à la place des aperçus
});

test('V2 sur mobile, les cartes passent en une colonne avec la capture mobile, sans débordement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Des sites pour tous les métiers' });
  const first = section.getByRole('link', { name: new RegExp(short(kept[0].label)) });
  await first.scrollIntoViewIfNeeded();
  const image = first.getByRole('img');
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
  expect(await image.evaluate((node: HTMLImageElement) => node.currentSrc)).toContain(`/vitrine/${kept[0].slug}/apercu-mobile.webp`);
  const widths = await section.locator('ul > li').evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().width)));
  expect(new Set(widths).size).toBe(1); // une seule colonne : toutes les cartes ont la même largeur (celle de l’écran)
  expect(widths[0]).toBeGreaterThan(300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('V3 chaque exemple : le vrai site (ordinateur et mobile) avec la mention « entreprise fictive », sans ancien système', async ({ page }) => {
  test.setTimeout(150_000);
  for (const entry of kept) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/exemples/${entry.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Exemple :');
    await expect(page.getByRole('link', { name: 'Créer un site comme celui-ci' })).toHaveAttribute('href', '/login?intent=business');
    const desktop = page.frameLocator(`iframe[title="Exemple de site : ${entry.label}"]`);
    await expect(desktop.locator('.demo-notice')).toContainText('Entreprise fictive');
    await expect(desktop.locator('.site-header')).toBeVisible();
    await expect(desktop.locator('h1')).toBeVisible();
    const mobile = page.frameLocator(`iframe[title="Exemple de site sur mobile : ${entry.label}"]`);
    await expect(mobile.locator('.demo-notice')).toContainText('Entreprise fictive');
    // Mobile : le site tient dans 390 px (aucun débordement horizontal à l'intérieur du cadre).
    const overflow = await page.locator(`iframe[title="Exemple de site sur mobile : ${entry.label}"]`).evaluate((frame: HTMLIFrameElement) => { const doc = frame.contentDocument!; return doc.documentElement.scrollWidth - doc.documentElement.clientWidth; });
    expect(overflow, `${entry.slug} mobile`).toBeLessThanOrEqual(0);
    // Plus de CDN Tailwind ni de script dans le site d'exemple.
    const html = await (await page.request.get(`/exemples/${entry.slug}/apercu`)).text();
    expect(html).not.toContain('cdn.tailwindcss.com');
    expect(html).not.toContain('<script');
    expect(html).toContain('Entreprise fictive');
    // Photos : toutes les images du site chargent.
    const images = [...html.matchAll(/src="(\/vitrine\/[^"]+)"/g)].map((match) => match[1]);
    for (const src of images.slice(0, 6)) expect((await page.request.get(src)).status(), src).toBe(200);
  }
});

test('V4 un formulaire d’un site d’exemple n’envoie rien : il explique que l’entreprise est fictive', async ({ page }) => {
  const entry = kept.find((candidate) => candidate.slug === 'plombier') ?? kept[0];
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/exemples/${entry.slug}`);
  const frame = page.frameLocator(`iframe[title="Exemple de site : ${entry.label}"]`);
  const form = frame.locator('form').first();
  await form.scrollIntoViewIfNeeded();
  for (const [name, value] of [['nom', 'Test'], ['email', 'test@example.com'], ['message', 'Bonjour']] as const) { const field = form.locator(`[name="${name}"]`); if (await field.count()) await field.fill(value); }
  const select = form.locator('select[name="prestation"]');
  if (await select.count()) await select.selectOption({ index: 1 });
  await form.locator('button[type="submit"]').click();
  await expect(frame.getByRole('heading', { name: 'Ceci est un site d’exemple' })).toBeVisible();
  await expect(frame.locator('body')).toContainText('rien n’a été enregistré');
});

test('V5 les exemples inconnus ou supprimés n’existent plus', async ({ page, request }) => {
  expect((await page.goto('/exemples/inconnu'))?.status()).toBe(404);
  expect((await page.goto('/exemples/kine'))?.status()).toBe(404); // ancien exemple supprimé
  expect((await page.goto('/exemples/consultant'))?.status()).toBe(404);
  expect((await request.get('/exemples/inconnu/apercu')).status()).toBe(404);
  const info = await request.get('/exemples/entreprise-fictive');
  expect(info.status()).toBe(200);
  expect(await info.text()).toContain('Ceci est un site d’exemple');
});
