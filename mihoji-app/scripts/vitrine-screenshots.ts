import Module from 'node:module';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

// Aperçus visuels des sites d'exemple pour les cartes de la page d'accueil : capture du haut de page, version ordinateur (800 px) et version mobile (300 px), en WebP,
// enregistrés dans public/vitrine/<slug>/ (versionnés : la vitrine ne dépend d'aucun service). À relancer quand un site d'exemple change.
// Lancer : npm run vitrine:screenshots [slug…]   (les photos Unsplash du site sont chargées depuis le réseau ; aucune IA, aucun coût)
const moduleInternals = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolveFilename = moduleInternals._resolveFilename;
moduleInternals._resolveFilename = (request, ...rest) => (request === 'server-only' ? resolve('scripts/empty-module.cjs') : resolveFilename(request, ...rest));
const types: Record<string, string> = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };

async function main() {
  const wanted = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const { listVitrineEntries, renderVitrineHtml } = await import('../src/lib/vitrine/store');
  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  for (const entry of listVitrineEntries().filter((candidate) => !wanted.length || wanted.includes(candidate.slug))) {
    const html = renderVitrineHtml(entry);
    for (const [label, width, height, outWidth] of [['ordinateur', 1280, 800, 800], ['mobile', 390, 844, 300]] as const) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.route('http://vitrine.local/**', async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/index.html') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
        const file = resolve('public', path.slice(1));
        if (file.startsWith(resolve('public')) && existsSync(file)) return route.fulfill({ contentType: types[extname(file)] ?? 'application/octet-stream', body: readFileSync(file), headers: { 'access-control-allow-origin': '*' } });
        return route.fulfill({ status: 404, body: '' });
      });
      await page.goto('http://vitrine.local/index.html', { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1200);
      const broken = await page.evaluate(() => [...document.images].filter((image) => image.complete && image.naturalWidth === 0 && image.getBoundingClientRect().top < window.innerHeight).length);
      const png = await page.screenshot({ type: 'png' });
      mkdirSync(resolve('public/vitrine', entry.slug), { recursive: true });
      const file = resolve('public/vitrine', entry.slug, `apercu-${label}.webp`);
      await sharp(png).resize({ width: outWidth }).webp({ quality: 80 }).toFile(file);
      console.log(`${entry.slug} ${label} : ${outWidth} px · images cassées dans l'écran : ${broken}`);
      await page.close();
    }
  }
  await browser.close();
}

main().then(() => process.exit(0), (error) => { console.error('ERREUR', String(error instanceof Error ? error.message : error).slice(0, 300)); process.exit(1); });
