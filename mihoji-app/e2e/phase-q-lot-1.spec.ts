import { expect, test } from '@playwright/test';
import { auditPage } from './design-audit';
import { authCookies } from './helpers';
import { samples } from '../src/lib/site/samples';
import { sectionTypes } from '../src/lib/site/schema';
import { styles } from '../src/lib/site/themes';

test.beforeEach(async ({ context }) => { await context.addCookies(authCookies()); });

test('Q1.1 la galerie /admin/design présente les 4 styles, leurs palettes, un site d’exemple et le catalogue de 15 sections', async ({ page }) => {
  await page.goto('/admin/design');
  await expect(page.getByRole('heading', { name: 'Design des sites générés' })).toBeVisible();
  for (const style of styles) await expect(page.getByRole('navigation', { name: 'Styles' }).getByRole('link', { name: style.label })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Palettes' }).getByRole('link')).toHaveCount(3);
  await expect(page.locator('iframe[title^="Site d’exemple"]')).toBeVisible();
  await expect(page.getByText('15 types de sections')).toBeVisible();
  await page.getByRole('navigation', { name: 'Styles' }).getByRole('link', { name: 'Élégant premium' }).click();
  await expect(page).toHaveURL(/style=premium/);
  await expect(page.getByRole('navigation', { name: 'Palettes' }).getByRole('link')).toHaveCount(2);
});

test('Q1.2 les pages de rendu sont réservées aux administrateurs', async ({ playwright, baseURL }) => {
  const anonymous = await playwright.request.newContext({ baseURL });
  expect((await anonymous.get('/admin/design/render?sample=boulangerie')).status()).toBe(403);
  await anonymous.dispose();
});

test('Q1.3 chaque exemple s’affiche sans débordement, avec ses polices auto-hébergées et sans service externe', async ({ page }) => {
  test.setTimeout(240_000);
  const external: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'images.unsplash.com'].includes(url.hostname) && url.protocol.startsWith('http')) external.push(request.url());
  });
  for (const sample of samples) {
    const style = styles.find((candidate) => candidate.id === sample.style)!;
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`/admin/design/render?sample=${sample.id}`);
      const audit = await auditPage(page);
      const label = `${sample.id} @${viewport.width}`;
      expect(audit.overflow, `${label} : débordement horizontal`).toBe(0);
      expect(audit.h1Count, `${label} : un seul h1`).toBe(1);
      expect(audit.imagesWithoutAlt, `${label} : images sans texte alternatif`).toBe(0);
      expect(audit.fonts, `${label} : polices chargées`).toEqual(expect.arrayContaining([style.fonts.heading.family, style.fonts.body.family]));
    }
  }
  expect(external).toEqual([]);
});

test('Q1.4 le contraste WCAG AA est respecté dans le navigateur pour chaque exemple, dans chaque style et chaque palette', async ({ page }) => {
  test.setTimeout(420_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  const failures: string[] = [];
  for (const sample of samples) {
    for (const style of styles) {
      for (const palette of style.palettes) {
        await page.goto(`/admin/design/render?sample=${sample.id}&style=${style.id}&palette=${palette.id}`);
        const audit = await auditPage(page);
        for (const failure of audit.contrast) failures.push(`${sample.id} en ${style.id}/${palette.id} : « ${failure.text} » ${failure.ratio}:1 (min ${failure.required}:1)`);
      }
    }
  }
  expect(failures).toEqual([]);
});

test('Q1.5 chaque type de section, dans chaque variante et chaque style, s’affiche sans débordement ni problème de lisibilité', async ({ page }) => {
  test.setTimeout(420_000);
  const problems: string[] = [];
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const style of styles) {
      for (const type of sectionTypes) {
        await page.goto(`/admin/design/render?catalogue=${type}&style=${style.id}`);
        const audit = await auditPage(page);
        if (audit.overflow) problems.push(`${style.id}/${type} @${viewport.width} : débordement`);
        for (const failure of audit.contrast) problems.push(`${style.id}/${type} @${viewport.width} : « ${failure.text} » ${failure.ratio}:1`);
      }
    }
  }
  expect(problems).toEqual([]);
});
