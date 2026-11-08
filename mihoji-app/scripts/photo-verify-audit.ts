import Module from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertE2eEnvironment, loadEnv } from './e2e-guard';

// Audit du contrôle visuel des photos (lecture seule, ne génère aucun site) : pour les emplacements d'images de sites déjà générés,
// reprend les candidates de la bibliothèque locale, fait contrôler chaque série par le modèle léger avec l'ancienne puis la nouvelle consigne,
// et mesure le taux de rejet. Les photos rejetées sont enregistrées en vignettes pour être regardées.
// Lancer : npm run photos:audit -- <dossier du banc> <cas1> <cas2> …   (coût : environ 0,001 € par site et par consigne)
const moduleInternals = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolveFilename = moduleInternals._resolveFilename;
moduleInternals._resolveFilename = (request, ...rest) => (request === 'server-only' ? resolve('scripts/empty-module.cjs') : resolveFilename(request, ...rest));

type Judged = { slot: number; subject: string; src: string; alt: string; before: boolean; after: boolean };

async function main() {
  loadEnv();
  assertE2eEnvironment();
  const [runDir, ...cases] = process.argv.slice(2);
  if (!runDir || !cases.length) throw new Error('usage : photos:audit <dossier du banc> <cas…>');
  const { imageSlots } = await import('../src/lib/photos/assign');
  const { LocalLibraryProvider } = await import('../src/lib/photos/local');
  const { normalizeQuery, rankCandidates, rankForSlot } = await import('../src/lib/photos/select');
  const { legacyVerifySystemPrompt, verifyPhotos, verifySystemPrompt } = await import('../src/lib/photos/verify');
  const { siteSchema } = await import('../src/lib/site/schema');
  const local = new LocalLibraryProvider();
  const out = resolve('docs/benchmark', 'photo-audit');
  mkdirSync(out, { recursive: true });
  const all: { case: string; judged: Judged[] }[] = [];
  let cost = 0;
  for (const id of cases) {
    const site = siteSchema.parse(JSON.parse(readFileSync(resolve(runDir, `${id}.json`), 'utf8')));
    const slots = imageSlots(site).filter((slot) => slot.query);
    const prepared = [];
    for (const [index, slot] of slots.entries()) {
      const queries = [slot.query as string, ...(slot.alternatives ?? [])].map(normalizeQuery);
      const pool = new Map<string, Awaited<ReturnType<typeof local.search>>['candidates'][number]>();
      for (const query of queries) for (const candidate of rankCandidates((await local.search(query)).candidates, query, 8, { trusted: true })) pool.set(candidate.src, candidate);
      const candidates = rankForSlot([...pool.values()], queries, 3);
      if (candidates.length) prepared.push({ id: index, subject: `${slot.alt} (recherche : ${slot.query})`, candidates });
    }
    const before = await verifyPhotos(prepared, { systemPrompt: legacyVerifySystemPrompt });
    const after = await verifyPhotos(prepared, { systemPrompt: verifySystemPrompt });
    cost += before.costEur + after.costEur;
    const judged: Judged[] = prepared.flatMap((slot) => slot.candidates.map((candidate, position) => ({
      slot: slot.id, subject: slot.subject, src: candidate.src, alt: candidate.alt ?? '',
      before: Boolean(before.verdicts?.find((entry) => entry.id === slot.id)?.accepted.includes(position)),
      after: Boolean(after.verdicts?.find((entry) => entry.id === slot.id)?.accepted.includes(position)),
    })));
    all.push({ case: id, judged });
    const rate = (key: 'before' | 'after') => `${judged.filter((entry) => !entry[key]).length}/${judged.length}`;
    console.log(`${id} : ${prepared.length} emplacements, ${judged.length} photos contrôlées · rejetées avant ${rate('before')} · après ${rate('after')}`);
  }
  const flat = all.flatMap((entry) => entry.judged);
  const pct = (count: number) => `${((count / flat.length) * 100).toFixed(0)} %`;
  console.log(`TOTAL : ${flat.length} photos · taux de rejet avant ${pct(flat.filter((e) => !e.before).length)} · après ${pct(flat.filter((e) => !e.after).length)} · coût ${cost.toFixed(4)} €`);
  writeFileSync(resolve(out, 'audit.json'), JSON.stringify({ cost, all }, null, 2));
  // Vignettes des photos rejetées « avant » mais acceptées « après » (candidates de rejet à tort) et des rejetées dans les deux cas.
  const { thumbnail } = await import('../src/lib/photos/verify');
  let n = 0;
  for (const entry of all) for (const photo of entry.judged.filter((candidate) => !candidate.before)) {
    n += 1;
    const response = await fetch(thumbnail(photo.src));
    if (response.ok) writeFileSync(resolve(out, `${String(n).padStart(2, '0')}-${entry.case}-${photo.after ? 'acceptee-apres' : 'rejetee-aussi-apres'}.jpg`), Buffer.from(await response.arrayBuffer()));
  }
  console.log(`Vignettes : ${out}`);
}

void main();
