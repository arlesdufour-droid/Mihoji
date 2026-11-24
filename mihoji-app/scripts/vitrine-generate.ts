import Module from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertE2eEnvironment, loadEnv } from './e2e-guard';

// Génère les sites d'exemple de la vitrine avec la VRAIE IA (une génération par site, jamais de nouvel essai), les enregistre comme fichiers statiques
// du dépôt (description structurée dans src/content/vitrine, photos hébergées dans public/vitrine) puis s'arrête.
// Lancer : npm run vitrine:generate [-- plombier coach] [--budget=0.5] [--force] [--mock --out=<dossier>]
// Garde-fou : le script s'arrête AVANT une génération qui ferait dépasser le budget (par défaut 0,50 €). Un site déjà généré n'est pas régénéré sans --force.
const moduleInternals = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolveFilename = moduleInternals._resolveFilename;
moduleInternals._resolveFilename = (request, ...rest) => (request === 'server-only' ? resolve('scripts/empty-module.cjs') : resolveFilename(request, ...rest));

async function main() {
  loadEnv();
  assertE2eEnvironment();
  const args = process.argv.slice(2);
  const mock = args.includes('--mock');
  const force = args.includes('--force');
  const budget = Number(args.find((arg) => arg.startsWith('--budget='))?.split('=')[1] ?? '0.5');
  const out = args.find((arg) => arg.startsWith('--out='))?.split('=')[1];
  const wanted = args.filter((arg) => !arg.startsWith('--'));
  if (mock) process.env.AI_MOCK = '1';

  const { vitrineCases } = await import('../src/lib/vitrine/cases');
  const { VITRINE_DIR, VITRINE_PHOTOS_DIR } = await import('../src/lib/vitrine/store');
  const { extensionOf, hostedPhotoIds, rewriteHostedPhotos, staticPhotoPath } = await import('../src/lib/vitrine/photos');
  const { runDesignGeneration, generationSite } = await import('../src/lib/site/design-service');
  const { designRoute } = await import('../src/lib/ai/routing');
  const { designCompanyOf } = await import('../src/lib/site/onboarding-request');
  const { factsOf } = await import('../src/lib/site/facts');
  const { readHostedPhoto } = await import('../src/lib/photos/hosting');
  const { siteSchema } = await import('../src/lib/site/schema');

  const route = designRoute();
  if (!mock && route.provider !== 'anthropic') throw new Error(`La vitrine se génère avec la vraie IA (Anthropic) ; fournisseur actuel : ${route.provider}. Utilisez --mock pour un essai sans coût.`);
  const contentDir = out ? resolve(out, 'content') : VITRINE_DIR();
  const photosDir = out ? resolve(out, 'photos') : VITRINE_PHOTOS_DIR();
  mkdirSync(contentDir, { recursive: true });

  const cases = vitrineCases.filter((item) => !wanted.length || wanted.includes(item.slug));
  console.log(`Vitrine : ${cases.length} site(s) · ${mock ? 'IA SIMULÉE' : route.provider === 'none' ? '—' : route.model} · budget ${budget.toFixed(2)} € · sortie ${contentDir}`);
  let spent = 0;
  let generated = 0;
  const costs: number[] = [];
  for (const item of cases) {
    const file = resolve(contentDir, `${item.slug}.json`);
    if (existsSync(file) && !force) { console.log(`→ ${item.slug} : déjà généré (ignoré, --force pour régénérer)`); continue; }
    const expected = costs.length ? Math.max(...costs) : 0.07; // estimation prudente : le plus cher des sites déjà faits
    if (!mock && spent + expected > budget) { console.log(`ARRÊT : ${item.slug} ferait dépasser le budget (${spent.toFixed(4)} € dépensés + ≈ ${expected.toFixed(3)} € estimés > ${budget.toFixed(2)} €).`); break; }
    console.log(`→ ${item.slug}…`);
    const { trade, company } = designCompanyOf({ name: item.company.name, activity: item.company.activity, address: item.company.address, missingFields: { phone: item.company.phone, email: item.company.email } });
    // Mêmes faits que l'onboarding : réponses au questionnaire de l'« entreprise » ; aucune ancienneté (rien d'inventé).
    const facts = factsOf({ company: { address: item.company.address }, profile: item.profile, request: item.request, city: company.city });
    const record = await runDesignGeneration({ task: 'create', request: item.request, trade: item.trade || trade, company, facts, workspaceId: null, photos: 'auto' });
    spent += record.shadowCostEur;
    costs.push(record.shadowCostEur);
    const site = generationSite(record);
    if (record.status !== 'succeeded' || !site) { console.log(`  ÉCHEC : ${record.error ?? 'génération refusée'} (${record.shadowCostEur.toFixed(4)} €) — aucun nouvel essai`); continue; }

    // Photos hébergées en base → fichiers statiques du dépôt.
    const paths: Record<string, string> = {};
    const ids = hostedPhotoIds(site);
    for (const [index, id] of ids.entries()) {
      const photo = await readHostedPhoto(id);
      const extension = photo ? extensionOf(photo.mime) : null;
      if (!photo || !extension) throw new Error(`photo hébergée illisible : ${id}`);
      const path = staticPhotoPath(item.slug, index, extension);
      mkdirSync(resolve(photosDir, item.slug), { recursive: true });
      writeFileSync(resolve(photosDir, item.slug, path.split('/').pop()!), photo.data);
      paths[id] = path;
    }
    const finalSite = siteSchema.parse(rewriteHostedPhotos(site, paths));
    const sections = finalSite.pages[0].sections.map((section) => (section.type === 'module' ? `module:${section.module}` : section.type));
    const entry = { slug: item.slug, label: item.label, family: item.family, module: item.module, request: item.request, company: item.company, profile: item.profile, model: record.model, costEur: Math.round(record.shadowCostEur * 1e6) / 1e6, attempts: record.attempts, generatedAt: new Date().toISOString(), photos: ids.length, description: finalSite };
    writeFileSync(file, `${JSON.stringify(entry, null, 2)}\n`);
    generated += 1;
    console.log(`  ${record.shadowCostEur.toFixed(4)} € · ${record.attempts} essai(s) · ${ids.length} photo(s) hébergée(s) · style ${finalSite.theme.style} · ${sections.join(', ')}`);
  }
  console.log(`TOTAL : ${generated} site(s) généré(s) · coût réel ${spent.toFixed(4)} € (budget ${budget.toFixed(2)} €)`);
}

main().then(() => process.exit(0), (error) => { console.error('ERREUR', error instanceof Error ? error.message : error); process.exit(1); });
