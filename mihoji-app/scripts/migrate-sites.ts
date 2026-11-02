import Module from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { loadEnv } from './e2e-guard';

// Migre les projets de l'ancien format (HTML) vers la description structurée, avec la vraie IA et sans perdre l'historique.
// Usage : npm run sites:migrate [-- <projectId>…]   (sans argument : tous les projets encore à l'ancien format)
// Base ciblée : DATABASE_URL de .env.local (développement). Captures : docs/screenshots/phase-q-lot4/.

const moduleInternals = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolveFilename = moduleInternals._resolveFilename;
moduleInternals._resolveFilename = (request, ...rest) => (request === 'server-only' ? resolve('scripts/empty-module.cjs') : resolveFilename(request, ...rest));

async function main() {
  loadEnv();
  const { migrateProjectToSite, legacyProjectIds } = await import('../src/lib/site/migrate');
  const { loadProjectSite, siteFiles } = await import('../src/lib/site/store');
  const { designRoute } = await import('../src/lib/ai/routing');
  const { getDb } = await import('../src/db/client');
  const { companies, projects } = await import('../src/db/schema');
  const { injectCompanyData } = await import('../src/lib/company/render');
  const { eq } = await import('drizzle-orm');
  const route = designRoute();
  if (route.provider !== 'anthropic' && route.provider !== 'groq') throw new Error('Clé IA requise (ANTHROPIC_API_KEY ou GROQ_API_KEY) : la migration recrée le site avec la vraie IA.');
  const args = process.argv.slice(2);
  const photosOnly = args.includes('--photos');
  const requested = args.filter((arg) => !arg.startsWith('--'));
  const ids = requested.length ? requested : photosOnly ? (await getDb().select({ id: (await import('../src/db/schema')).projects.id }).from((await import('../src/db/schema')).projects)).map((row) => row.id) : await legacyProjectIds();
  console.log(`${ids.length} projet(s) à migrer (${route.provider} ${route.model}).`);
  const outDir = resolve('docs/screenshots/phase-q-lot4');
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const id of ids) {
      const [project] = await getDb().select().from(projects).where(eq(projects.id, id)).limit(1);
      console.log(`→ ${project?.name ?? id}…`);
      if (photosOnly) {
        // Complète les photos manquantes d'un site déjà migré (quota Unsplash épuisé lors de la migration) : nouvelle version, rien d'autre ne change.
        const { resolveSitePhotos } = await import('../src/lib/photos/service');
        const { saveProjectSite } = await import('../src/lib/site/store');
        const { siteSchema } = await import('../src/lib/site/schema');
        const current = await loadProjectSite(id);
        if (!current) { console.log('  ancien format : rien à compléter.'); continue; }
        const { site: filled, report } = await resolveSitePhotos(current);
        console.log(`  ${JSON.stringify(report)}`);
        if (JSON.stringify(filled) !== JSON.stringify(current)) {
          const saved = await getDb().transaction((tx) => saveProjectSite(tx, { projectId: id, site: siteSchema.parse(filled), summary: 'Ajout des photos manquantes', createdBy: 'agent' }));
          console.log(`  nouvelle version ${saved.versionId}`);
        }
      }
      const result = photosOnly ? { status: 'already' as const } : await migrateProjectToSite(id);
      console.log(`  ${JSON.stringify(result)}`);
      if (result.status === 'failed' || (result.status === 'already' && !photosOnly)) continue;
      const site = await loadProjectSite(id);
      const [company] = await getDb().select().from(companies).where(eq(companies.workspaceId, project.workspaceId)).limit(1);
      if (!site) continue;
      const html = injectCompanyData(siteFiles(site).get('index.html')!.replaceAll('"/fonts/', `"${pathToFileURL(resolve('public/fonts')).href}/`).replaceAll('url(/fonts/', `url(${pathToFileURL(resolve('public/fonts')).href}/`), company);
      const file = resolve(outDir, `${id}.html`);
      writeFileSync(file, html);
      for (const [label, viewport] of [['ordinateur', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]] as const) {
        const page = await browser.newPage({ viewport });
        await page.goto(pathToFileURL(file).href);
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
        await page.waitForLoadState('networkidle').catch(() => undefined);
        await page.screenshot({ path: resolve(outDir, `${(project?.name ?? id).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${label}.jpg`), fullPage: true, quality: 70, type: 'jpeg' });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
