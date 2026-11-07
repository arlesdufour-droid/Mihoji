import Module from 'node:module';
import { resolve } from 'node:path';
import { assertE2eEnvironment, loadEnv } from './e2e-guard';

// Test de fumée des photos avec les VRAIES clés (Pixabay, Unsplash) : un petit site d'une requête, sans IA de design.
// Usage : npx tsx scripts/smoke-photos.ts — vérifie la recherche Pixabay, le téléchargement, l'hébergement et le contrôle visuel.
const internals = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const original = internals._resolveFilename;
internals._resolveFilename = (request, ...rest) => (request === 'server-only' ? resolve('scripts/empty-module.cjs') : original(request, ...rest));

async function main() {
  loadEnv();
  assertE2eEnvironment();
  console.log('Clés présentes — Pixabay :', Boolean(process.env.PIXABAY_API_KEY), '· Unsplash :', Boolean(process.env.UNSPLASH_ACCESS_KEY), '· Anthropic :', Boolean(process.env.ANTHROPIC_API_KEY));
  const { resolveSitePhotos } = await import('../src/lib/photos/service');
  const { samples } = await import('../src/lib/site/samples');
  const { siteSchema } = await import('../src/lib/site/schema');
  const site = siteSchema.parse(samples[0].site);
  const started = Date.now();
  const { site: result, report } = await resolveSitePhotos(site, { patient: true, onWait: (s) => console.log(`attente ${s}s`) });
  console.log(JSON.stringify(report, null, 1));
  const urls = JSON.stringify(result).match(/(\/api\/hosted-photos\/[0-9a-f-]+|https:\/\/(?:cdn\.)?pixabay\.com\/(?:get|photo)\/[^"]*|https:\/\/images\.unsplash\.com[^"]*)/g) ?? [];
  console.log(`${urls.length} adresse(s) d'image, ${Math.round((Date.now() - started) / 1000)} s :`);
  for (const url of [...new Set(urls)].slice(0, 8)) console.log(' -', url.slice(0, 110));
  if (urls.some((url) => /pixabay\.com\/(get|photo)\//.test(url) || url.includes('cdn.pixabay.com'))) throw new Error('Une adresse Pixabay subsiste : elle devrait être hébergée.');
  process.exit(0);
}
main().catch((error) => { console.error(error); process.exit(1); });
