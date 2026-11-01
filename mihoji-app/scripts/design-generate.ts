import Module from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { assertE2eEnvironment, loadEnv } from './e2e-guard';

// Génération réelle de sites par le modèle de design (vraie IA, base de développement), avec captures d'écran.
// Usage : npm run design:generate [-- boulangerie coach plombier]
// Les générations sont enregistrées dans site_generations (visibles sur /admin/design/generate) ;
// la description, le HTML et les captures sont écrits dans docs/screenshots/phase-q-lot2/.

// Les modules serveur importent « server-only » (fourni par Next) : hors de Next, on le remplace par un module vide.
const moduleInternals = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolveFilename = moduleInternals._resolveFilename;
moduleInternals._resolveFilename = (request, ...rest) => (request === 'server-only' ? resolve('scripts/empty-module.cjs') : resolveFilename(request, ...rest));

async function main() {
  loadEnv();
  // Base de développement uniquement (même garde-fou que les tests e2e).
  assertE2eEnvironment();
  const { designExamples } = await import('../src/lib/site/design-examples');
  const { runDesignGeneration, generationSite } = await import('../src/lib/site/design-service');
  const { designRoute } = await import('../src/lib/ai/routing');
  const { renderSite } = await import('../src/lib/site/render');
  const { injectCompanyData, cityOf } = await import('../src/lib/company/render');
  const { activeModules } = await import('../src/lib/site/modules');

  const route = designRoute();
  if (route.provider !== 'anthropic' && route.provider !== 'groq') throw new Error('Clé IA requise (ANTHROPIC_API_KEY ou GROQ_API_KEY) : ce script utilise la vraie IA.');
  const wanted = process.argv.slice(2);
  const examples = designExamples.filter((example) => wanted.length === 0 || wanted.includes(example.id));
  const outDir = resolve('docs/screenshots/phase-q-lot2');
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const summary: string[] = [];
  try {
    for (const example of examples) {
      console.log(`→ ${example.id} (${route.provider} ${route.model})…`);
      const company = { ...example.company, city: cityOf(example.company.address), hasPhone: true, hasEmail: true };
      const record = await runDesignGeneration({ task: 'create', request: example.request, trade: example.trade, company, workspaceId: null });
      const line = `${example.id} : ${record.status}, ${record.model}, ${record.attempts} essai(s), ${(record.durationMs / 1000).toFixed(1)} s, ${record.promptTokens} + ${record.cacheReadTokens} (cache) jetons en entrée, ${record.completionTokens} en sortie, ${record.shadowCostEur.toFixed(4)} €`;
      console.log(`  ${line}`);
      const site = generationSite(record);
      if (!site) {
        summary.push(`${line} — ${record.error}`);
        continue;
      }
      summary.push(`${line} — style ${site.theme.style}/${site.theme.palette ?? 'défaut'}, modules : ${activeModules(site.modules).join(', ') || 'aucun'}, sections : ${site.pages[0].sections.map((section) => section.type === 'module' ? `module:${section.module}` : section.type).join(' > ')} — id ${record.id}`);
      writeFileSync(resolve(outDir, `${example.id}.json`), JSON.stringify(site, null, 2));
      const html = injectCompanyData(renderSite(site, { inlineCss: true, fontBase: pathToFileURL(resolve('public/fonts')).href }).files['index.html'], { ...example.company, legalForm: '', missingFields: {} });
      const file = resolve(outDir, `${example.id}.html`);
      writeFileSync(file, html);
      for (const [label, viewport] of [['ordinateur', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]] as const) {
        const page = await browser.newPage({ viewport });
        await page.goto(pathToFileURL(file).href);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: resolve(outDir, `${example.id}-${label}.jpg`), fullPage: true, quality: 70, type: 'jpeg' });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  // Le résumé garde les lignes des demandes non régénérées cette fois-ci.
  const summaryFile = resolve(outDir, 'resume.txt');
  const regenerated = new Set(examples.map((example) => example.id));
  const kept = existsSync(summaryFile) ? readFileSync(summaryFile, 'utf8').split('\n').filter((line) => line && !regenerated.has(line.split(' : ')[0])) : [];
  writeFileSync(summaryFile, `${[...kept, ...summary].sort().join('\n')}\n`);
  console.log(`\n${summary.join('\n')}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
