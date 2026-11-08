import Module from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { assertE2eEnvironment, loadEnv } from './e2e-guard';

// Comparaison par paires de deux exécutions du banc (ancienne puis nouvelle) : pour chaque cas commun (même identifiant, même demande),
// le juge voit « Site A » et « Site B » (ordre tiré au hasard, équilibré) et donne un verdict par critère avec une phrase de justification.
// Lancer : npm run benchmark:compare -- <exécution ancienne> <exécution nouvelle> [cas…] [--max-cost=0.6]
// Coût : environ 0,03 € par cas (juge Opus 5.5, quatre captures) ; aucune génération de site.
const moduleInternals = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolveFilename = moduleInternals._resolveFilename;
moduleInternals._resolveFilename = (request, ...rest) => (request === 'server-only' ? resolve('scripts/empty-module.cjs') : resolveFilename(request, ...rest));

type SiteResult = { id: string; label: string; request: string; status: string };

async function main() {
  loadEnv();
  assertE2eEnvironment();
  const args = process.argv.slice(2);
  const maxCost = Number(args.find((arg) => arg.startsWith('--max-cost='))?.split('=')[1] ?? '0.6');
  const [oldRun, newRun, ...only] = args.filter((arg) => !arg.startsWith('--'));
  if (!oldRun || !newRun) throw new Error('usage : benchmark:compare <exécution ancienne> <exécution nouvelle> [cas…]');
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY requise (juge)');
  const { assignOrders, aggregate, isComparable, positionBias, toOutcome, PAIR_CRITERIA } = await import('../src/lib/site/benchmark-compare');
  const { judgePair } = await import('../src/lib/site/benchmark-judge');
  const { JUDGE_MODEL, RUBRIC_VERSION } = await import('../src/lib/site/benchmark-rubric');
  const { benchmarkCases } = await import('../src/lib/site/benchmark-cases');
  const dirOf = (run: string) => resolve('docs/benchmark', run);
  const load = (run: string) => (JSON.parse(readFileSync(resolve(dirOf(run), 'results.json'), 'utf8')) as { sites: SiteResult[]; benchmarkVersion: number }).sites;
  const [oldSites, newSites] = [load(oldRun), load(newRun)];
  const skipped: { id: string; reason: string }[] = [];
  const pairs: { id: string; request: string }[] = [];
  for (const site of newSites) {
    if (only.length && !only.includes(site.id)) continue;
    const before = oldSites.find((candidate) => candidate.id === site.id);
    if (!before) { skipped.push({ id: site.id, reason: 'absent de l’ancienne exécution' }); continue; }
    if (before.status !== 'succeeded' || site.status !== 'succeeded') { skipped.push({ id: site.id, reason: 'génération en échec' }); continue; }
    if (!isComparable(before, site)) { skipped.push({ id: site.id, reason: 'demande différente' }); continue; }
    const files = [oldRun, newRun].flatMap((run) => [`${site.id}-ordinateur.jpg`, `${site.id}-mobile.jpg`].map((name) => resolve(dirOf(run), name)));
    if (!files.every((file) => existsSync(file))) { skipped.push({ id: site.id, reason: 'captures manquantes' }); continue; }
    pairs.push({ id: site.id, request: site.request });
  }
  const orders = assignOrders(pairs.map((pair) => pair.id));
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const results: Awaited<ReturnType<typeof runPairs>> = await runPairs();

  async function runPairs() {
    const out: { caseId: string; order: 'old-first' | 'new-first'; verdicts: Record<(typeof PAIR_CRITERIA)[number], { verdict: 'A' | 'egal' | 'B'; raison: string }>; costEur: number }[] = [];
    let spent = 0;
    for (const pair of pairs) {
      if (spent >= maxCost) { skipped.push({ id: pair.id, reason: `plafond de coût atteint (${maxCost} €)` }); continue; }
      const order = orders[pair.id];
      const read = (run: string) => ({ desktopJpeg: readFileSync(resolve(dirOf(run), `${pair.id}-ordinateur.jpg`)), mobileJpeg: readFileSync(resolve(dirOf(run), `${pair.id}-mobile.jpg`)) });
      const [a, b] = order === 'old-first' ? [read(oldRun), read(newRun)] : [read(newRun), read(oldRun)];
      const meta = benchmarkCases.find((item) => item.id === pair.id);
      const outcome = await judgePair(anthropic, { request: pair.request, trade: meta?.company.activity ?? '', company: meta?.company.name ?? pair.id, a, b });
      spent += outcome.costEur;
      if (!outcome.verdicts) { skipped.push({ id: pair.id, reason: outcome.error ?? 'juge illisible' }); continue; }
      out.push({ caseId: pair.id, order, verdicts: outcome.verdicts, costEur: outcome.costEur });
      console.log(`${pair.id} : ${order === 'old-first' ? 'ancienne en A' : 'nouvelle en A'} · ${PAIR_CRITERIA.map((criterion) => `${criterion} ${toOutcome(outcome.verdicts![criterion].verdict, order).replace('_better', '').replace('new', 'N').replace('old', 'A').replace('equal', '=')}`).join(' · ')} · ${outcome.costEur.toFixed(4)} € (${outcome.promptTokens}+${outcome.completionTokens} jetons)`);
    }
    return out;
  }

  const tally = aggregate(results);
  const bias = positionBias(results);
  const cost = results.reduce((sum, result) => sum + result.costEur, 0);
  const outDir = resolve('docs/benchmark/compare', `${oldRun}__${newRun}`);
  mkdirSync(outDir, { recursive: true });
  // Un fichier par modèle juge : on peut comparer deux juges sur les mêmes exécutions (accord, coût).
  writeFileSync(resolve(outDir, `pairs-${JUDGE_MODEL}.json`), JSON.stringify({ oldRun, newRun, judgeModel: JUDGE_MODEL, rubricVersion: RUBRIC_VERSION, createdAt: new Date().toISOString(), cases: results.map((result) => ({ ...result, outcomes: Object.fromEntries(PAIR_CRITERIA.map((criterion) => [criterion, toOutcome(result.verdicts[criterion].verdict, result.order)])) })), skipped, aggregate: tally, positionBias: bias, totalCostEur: Math.round(cost * 10000) / 10000 }, null, 2));
  console.log('\nNouvelle version : meilleure / égale / moins bonne (valeur p du test de signe)');
  for (const key of [...PAIR_CRITERIA, 'overall'] as const) console.log(`  ${key.padEnd(12)} ${tally[key].newBetter} / ${tally[key].equal} / ${tally[key].oldBetter}  (p = ${tally[key].pValue === null ? '—' : tally[key].pValue!.toFixed(3)})`);
  console.log(`Biais de position : ${bias.aShare === null ? '—' : `${(bias.aShare * 100).toFixed(0)} %`} de « A meilleur » sur ${bias.decided} verdicts tranchés · ${results.length} cas · ${skipped.length} ignoré(s) · coût ${cost.toFixed(4)} € (${JUDGE_MODEL})`);
  console.log(`Résultats : ${outDir}/pairs-${JUDGE_MODEL}.json`);
}

void main();
