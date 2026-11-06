import Module from 'node:module';
import { copyFileSync, createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { createHash } from 'node:crypto';
import { resolve, extname } from 'node:path';
import type { AddressInfo } from 'node:net';
import Anthropic from '@anthropic-ai/sdk';
import { chromium } from '@playwright/test';
import { assertE2eEnvironment, loadEnv } from './e2e-guard';

// Banc d'essai de qualité (phase Q, lot 6) : génère les 12 sites du banc avec la VRAIE IA (base de développement),
// puis pour chacun : captures ordinateur et mobile, contrôles automatiques du rendu, Lighthouse (contrôle du rendu) et juge IA.
// Usage : npm run benchmark [-- plombier coach] [--photos=local|unsplash] [--no-judge] [--no-lighthouse]
//   --photos=local     (défaut) bibliothèque locale uniquement : photos identiques d'une exécution à l'autre, pour comparer avant/après.
//   --photos=unsplash  cache puis Unsplash : jugement visuel ponctuel, non comparable aux exécutions « local ».
// Sortie : docs/benchmark/<AAAA-MM-JJ-HHmm>/ (results.json, <id>.json, <id>.html, <id>-ordinateur.jpg, <id>-mobile.jpg) et docs/benchmark/latest.json.

// Les modules serveur importent « server-only » (fourni par Next) : hors de Next, on le remplace par un module vide.
const moduleInternals = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolveFilename = moduleInternals._resolveFilename;
moduleInternals._resolveFilename = (request, ...rest) => (request === 'server-only' ? resolve('scripts/empty-module.cjs') : resolveFilename(request, ...rest));

const MAX_SHOT_HEIGHT = 7_500; // l'API d'images refuse plus de 8 000 px

function stamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function staticServer(runDir: string): Promise<{ server: Server; origin: string }> {
  const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2', '.json': 'application/json' };
  const server = createServer((request, response) => {
    const path = decodeURIComponent((request.url ?? '/').split('?')[0]);
    const file = path.startsWith('/fonts/') ? resolve('public', path.slice(1)) : resolve(runDir, path.slice(1));
    const allowed = path.startsWith('/fonts/') ? file.startsWith(resolve('public/fonts')) : file.startsWith(runDir);
    if (!allowed || !existsSync(file)) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(response);
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done({ server, origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}` })));
}

async function main() {
  loadEnv();
  // Base de développement uniquement (même garde-fou que les tests e2e).
  assertE2eEnvironment();
  const args = process.argv.slice(2);
  const photosArg = args.find((arg) => arg.startsWith('--photos='))?.slice('--photos='.length) ?? 'local';
  if (photosArg !== 'local' && photosArg !== 'unsplash') throw new Error('--photos doit valoir local ou unsplash.');
  const noJudge = args.includes('--no-judge');
  const noLighthouse = args.includes('--no-lighthouse');
  const wanted = args.filter((arg) => !arg.startsWith('--'));

  const { benchmarkCases, BENCHMARK_VERSION } = await import('../src/lib/site/benchmark-cases');
  const { RUBRIC_VERSION } = await import('../src/lib/site/benchmark-rubric');
  const { computeTotals, computeUniformity } = await import('../src/lib/site/benchmark');
  const { judgeSite } = await import('../src/lib/site/benchmark-judge');
  const { runDesignGeneration, generationSite } = await import('../src/lib/site/design-service');
  const { designRoute } = await import('../src/lib/ai/routing');
  const { designSystemPrompt } = await import('../src/lib/site/design-prompt');
  const { designCompanyOf } = await import('../src/lib/site/onboarding-request');
  const { renderSite } = await import('../src/lib/site/render');
  const { injectCompanyData } = await import('../src/lib/company/render');
  const { activeModules } = await import('../src/lib/site/modules');
  const { findFiller } = await import('../src/lib/site/schema');
  const { auditPage } = await import('../e2e/design-audit');
  type SiteResult = import('../src/lib/site/benchmark').SiteResult;
  type PhotoReport = import('../src/lib/photos/service').PhotoReport;

  const route = designRoute();
  if (route.provider !== 'anthropic') throw new Error(`Le banc exige le modèle de design Anthropic (fournisseur actuel : ${route.provider}) : résultats non comparables sinon.`);
  const cases = benchmarkCases.filter((item) => wanted.length === 0 || wanted.includes(item.id));
  if (cases.length === 0) throw new Error(`Aucun cas ne correspond à : ${wanted.join(', ')}`);

  const runId = stamp();
  const baseDir = resolve('docs/benchmark');
  const runDir = resolve(baseDir, runId);
  mkdirSync(runDir, { recursive: true });
  const { server, origin } = await staticServer(runDir);
  const browser = await chromium.launch();
  const anthropic = noJudge ? null : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let chrome: { port: number; kill: () => Promise<void> | void } | null = null;
  let runLighthouse: ((url: string, desktop: boolean) => Promise<{ performance: number; accessibility: number; seo: number; bestPractices: number }>) | null = null;
  if (!noLighthouse) {
    try {
      const { launch } = await import('chrome-launcher');
      const lighthouse = (await import('lighthouse')).default;
      const desktopConfig = (await import('lighthouse/core/config/desktop-config.js')).default;
      chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
      const port = chrome.port;
      runLighthouse = async (url, desktop) => {
        const result = await lighthouse(url, { port, logLevel: 'error', output: 'json', onlyCategories: ['performance', 'accessibility', 'seo', 'best-practices'] }, desktop ? desktopConfig : undefined);
        const categories = result?.lhr.categories;
        const score = (key: string) => Math.round((categories?.[key]?.score ?? 0) * 100);
        return { performance: score('performance'), accessibility: score('accessibility'), seo: score('seo'), bestPractices: score('best-practices') };
      };
    } catch (error) {
      console.warn('Lighthouse indisponible, mesure ignorée :', error instanceof Error ? error.message : error);
    }
  }

  const sites: SiteResult[] = [];
  console.log(`Banc d'essai v${BENCHMARK_VERSION} · grille v${RUBRIC_VERSION} · ${cases.length} site(s) · ${route.model} · photos : ${photosArg} → ${runDir}`);
  try {
    for (const item of cases) {
      console.log(`→ ${item.id}…`);
      const { trade, company } = designCompanyOf({ name: item.company.name, activity: item.company.activity, address: item.company.address, missingFields: { phone: item.company.phone, email: item.company.email } });
      let photoReport: PhotoReport | undefined;
      const record = await runDesignGeneration({ task: 'create', request: item.request, trade, company, workspaceId: null, photos: photosArg === 'local' ? 'local' : 'auto', onPhotos: (report) => { photoReport = report; } });
      const result: SiteResult = {
        id: item.id, label: item.label, request: item.request, status: record.status, error: record.error ?? undefined, poorData: item.poorData,
        generation: { id: record.id, costEur: record.shadowCostEur, attempts: record.attempts, durationMs: record.durationMs, promptTokens: record.promptTokens, completionTokens: record.completionTokens, cacheReadTokens: record.cacheReadTokens, cacheWriteTokens: record.cacheWriteTokens, model: record.model },
        photos: photoReport,
      };
      sites.push(result);
      const site = generationSite(record);
      if (!site) { console.log(`  échec : ${record.error}`); continue; }
      result.style = site.theme.style;
      result.palette = site.theme.palette;
      result.sections = site.pages[0].sections.map((section) => section.type === 'module' ? `module:${section.module}` : section.type);
      result.modules = activeModules(site.modules);
      writeFileSync(resolve(runDir, `${item.id}.json`), JSON.stringify(site, null, 2));
      const html = injectCompanyData(renderSite(site, { inlineCss: true, fontBase: `${origin}/fonts` }).files['index.html'], { name: item.company.name, activity: item.company.activity, address: item.company.address, legalForm: '', email: item.company.email, phone: item.company.phone, missingFields: { email: item.company.email, phone: item.company.phone } });
      writeFileSync(resolve(runDir, `${item.id}.html`), html);
      const url = `${origin}/${item.id}.html`;

      // Captures et contrôles du rendu, ordinateur puis mobile.
      const shots: Record<'ordinateur' | 'mobile', Buffer> = {} as never;
      const audits = {} as Record<'ordinateur' | 'mobile', Awaited<ReturnType<typeof auditPage>>>;
      let brokenImages = 0;
      for (const [label, viewport] of [['ordinateur', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]] as const) {
        const page = await browser.newPage({ viewport });
        // tsx (esbuild) injecte __name dans les fonctions passées à evaluate : le navigateur doit le connaître.
        await page.addInitScript('window.__name = (fn) => fn;');
        await page.goto(url, { waitUntil: 'load' });
        await page.evaluate(async () => { await document.fonts.ready; for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((done) => setTimeout(done, 120)); } window.scrollTo(0, 0); });
        await page.evaluate(() => Promise.race([Promise.all([...document.images].map((image) => (image.complete ? null : new Promise((done) => { image.onload = image.onerror = () => done(null); })))), new Promise((done) => setTimeout(done, 10_000))]));
        audits[label] = await auditPage(page);
        brokenImages = Math.max(brokenImages, await page.evaluate(() => [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length));
        // Les éléments « sticky » apparaîtraient au milieu d'une capture pleine page : on les remet dans le flux, pour la capture seulement.
        await page.addStyleTag({ content: '.site-header,.mod-side{position:static !important}' });
        const height = Math.min(await page.evaluate(() => document.documentElement.scrollHeight), MAX_SHOT_HEIGHT);
        shots[label] = await page.screenshot({ path: resolve(runDir, `${item.id}-${label}.jpg`), fullPage: true, clip: { x: 0, y: 0, width: viewport.width, height }, quality: 70, type: 'jpeg' });
        await page.close();
      }
      const summary = (audit: (typeof audits)['mobile']) => ({ overflow: audit.overflow, contrastFailures: audit.contrast.length, imagesWithoutAlt: audit.imagesWithoutAlt, h1Count: audit.h1Count });
      result.checks = { desktop: summary(audits.ordinateur), mobile: summary(audits.mobile), filler: findFiller(site).map((entry) => entry.text.slice(0, 60)), brokenImages };

      if (runLighthouse) {
        try {
          result.lighthouse = { mobile: await runLighthouse(url, false), desktop: await runLighthouse(url, true) };
        } catch (error) {
          result.lighthouse = { error: error instanceof Error ? error.message : 'Lighthouse a échoué' };
        }
      }
      if (anthropic) {
        result.judge = await judgeSite(anthropic, { request: item.request, trade, company: item.company.name, desktopJpeg: shots.ordinateur, mobileJpeg: shots.mobile });
      }
      const judge = result.judge?.mean !== undefined ? `juge ${result.judge.mean}/5` : result.judge?.error ? `juge : ${result.judge.error}` : 'sans juge';
      console.log(`  ${result.style}/${result.palette ?? 'défaut'} · ${record.attempts} essai(s) · ${(record.durationMs / 1000).toFixed(1)} s · ${record.shadowCostEur.toFixed(4)} € · ${judge}`);
    }
  } finally {
    await browser.close();
    await chrome?.kill();
    server.close();
  }

  const results = {
    benchmarkVersion: BENCHMARK_VERSION,
    rubricVersion: RUBRIC_VERSION,
    runId,
    startedAt: new Date().toISOString(),
    photos: photosArg,
    provider: route.provider,
    model: route.model,
    effort: 'medium',
    promptHash: createHash('sha256').update(designSystemPrompt).digest('hex').slice(0, 12),
    totals: computeTotals(sites),
    uniformity: computeUniformity(sites),
    sites,
  };
  writeFileSync(resolve(runDir, 'results.json'), JSON.stringify(results, null, 2));
  // latest.json ne remplace une exécution complète que par une autre exécution complète (un sous-ensemble ne l'écrase pas).
  if (cases.length === benchmarkCases.length) copyFileSync(resolve(runDir, 'results.json'), resolve(baseDir, 'latest.json'));
  const { totals, uniformity } = results;
  console.log(`\nTotal : ${totals.succeeded}/${totals.sites} sites · génération ${totals.generationCostEur.toFixed(3)} € (moyenne ${totals.averageGenerationCostEur.toFixed(4)} €) · juge ${totals.judgeCostEur.toFixed(3)} € · total ${totals.totalCostEur.toFixed(3)} € · note moyenne du juge ${totals.judgeMean ?? '—'}`);
  console.log(`Uniformité : styles ${JSON.stringify(uniformity.styles)} · ${uniformity.sitesInSameSequenceGroup} site(s) partagent une même séquence de sections (${uniformity.distinctSequences} séquences distinctes)`);
  console.log(`Résultats : ${resolve(runDir, 'results.json')}`);
}

// Sortie explicite : la connexion à la base et les clients HTTP gardent sinon le processus ouvert.
main().then(() => process.exit(0), (error) => {
  console.error(error);
  process.exit(1);
});
