import { test } from '@playwright/test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { authCookies } from './helpers';
import { samples } from '../src/lib/site/samples';
import { sectionTypes } from '../src/lib/site/schema';
import { styles } from '../src/lib/site/themes';

// Génère les captures du lot : un site d'exemple par style (ordinateur et mobile) et le catalogue des sections.
const OUT = process.env.DESIGN_OUT ?? 'docs/screenshots/phase-q-lot1';
mkdirSync(OUT, { recursive: true });

async function settle(page: import('@playwright/test').Page) {
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.evaluate(() => Promise.all([...document.images].map((image) => image.complete ? null : new Promise((resolve) => { image.onload = image.onerror = () => resolve(null); }))));
  await page.waitForTimeout(300);
}

test.beforeEach(async ({ context }) => { await context.addCookies(authCookies()); });

for (const sample of samples) {
  test(`capture ${sample.id}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/admin/design/render?sample=${sample.id}`);
    await settle(page);
    await page.screenshot({ path: `${OUT}/${sample.id}-ordinateur.jpg`, fullPage: true, type: 'jpeg', quality: 68 });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/admin/design/render?sample=${sample.id}`);
    await settle(page);
    await page.screenshot({ path: `${OUT}/${sample.id}-mobile.jpg`, clip: { x: 0, y: 0, width: 390, height: 2200 }, fullPage: true, type: 'jpeg', quality: 68 });
  });
}

for (const style of styles) {
  test(`catalogue ${style.id}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const type of sectionTypes) {
      await page.goto(`/admin/design/render?catalogue=${type}&style=${style.id}`);
      await settle(page);
      await page.screenshot({ path: `${OUT}/catalogue/${style.id}-${type}.jpg`, fullPage: true, type: 'jpeg', quality: 60 });
    }
  });
}

// Planches de synthèse : une par style (toutes les sections, début de chaque catalogue) et une avec les 4 sites d'exemple.
async function sheet(page: import('@playwright/test').Page, name: string, html: string, width: number) {
  const file = `${OUT}/.planche-${name}.html`;
  writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:24px;background:#0f172a;font:600 14px system-ui;color:#e2e8f0}.g{display:grid;gap:18px}figure{margin:0}figcaption{padding:6px 2px}img{display:block;width:100%;border-radius:8px}.c img{height:430px;object-fit:cover;object-position:top}</style>${html}`);
  await page.setViewportSize({ width, height: 900 });
  await page.goto(pathToFileURL(resolve(file)).href);
  await page.waitForLoadState('load');
  await page.screenshot({ path: `${OUT}/planche-${name}.jpg`, fullPage: true, type: 'jpeg', quality: 72 });
  rmSync(file);
}

test('planches', async ({ page }) => {
  for (const style of styles) {
    const cells = sectionTypes.map((type) => `<figure class="c"><figcaption>${style.label} — ${type}</figcaption><img src="catalogue/${style.id}-${type}.jpg"></figure>`).join('');
    await sheet(page, `style-${style.id}`, `<div class="g" style="grid-template-columns:repeat(5,1fr)">${cells}</div>`, 1900);
  }
  const sites = samples.map((sample) => `<figure><figcaption>${sample.label} — ${styles.find((style) => style.id === sample.style)?.label}</figcaption><img src="${sample.id}-ordinateur.jpg"></figure>`).join('');
  await sheet(page, 'sites', `<div class="g" style="grid-template-columns:repeat(4,1fr);align-items:start">${sites}</div>`, 1900);
});

// Même site, autres palettes : le style reste, les couleurs changent (contraste AA garanti pour chacune).
test('palettes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const [sampleId, style, palette] of [['avocat', 'premium', 'noir-or'], ['boulangerie', 'artisan', 'foret'], ['coach', 'dynamique', 'turquoise']] as const) {
    await page.goto(`/admin/design/render?sample=${sampleId}&style=${style}&palette=${palette}`);
    await settle(page);
    await page.screenshot({ path: `${OUT}/palette-${sampleId}-${palette}.jpg`, clip: { x: 0, y: 0, width: 1280, height: 1900 }, fullPage: true, type: 'jpeg', quality: 68 });
  }
});
