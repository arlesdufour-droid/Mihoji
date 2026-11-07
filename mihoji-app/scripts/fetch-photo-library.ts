import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { loadEnv } from './e2e-guard';
import { catalogueSection, samples } from '../src/lib/site/samples';
import { collectStrings, sectionTypes, sectionVariants } from '../src/lib/site/schema';
import { rankCandidates } from '../src/lib/photos/select';
import { UnsplashProvider } from '../src/lib/photos/unsplash';
import { libraryQueries } from './photo-queries';

// Construit la bibliothèque locale de photos (repli) et les photos des sites d'exemple.
// Une seule recherche Unsplash par requête (quota : 50 requêtes par heure en mode démonstration) ; on s'arrête avant l'épuisement.
// Usage : npx tsx scripts/fetch-photo-library.ts   (UNSPLASH_ACCESS_KEY dans .env.local)

const tradeQueries = [
  'plumber repairing pipe under sink', 'electrician installing electrical panel', 'restaurant chef plating dish', 'florist arranging bouquet flowers shop',
  'car mechanic garage repairing engine', 'photographer holding camera studio', 'business consultant meeting laptop', 'hairdresser salon cutting hair',
  'painter decorator painting wall', 'carpenter woodworking workshop', 'gardener landscaping garden', 'cleaning service professional cleaning home',
  'accountant desk calculator documents', 'dentist dental clinic', 'real estate agent keys house', 'butcher shop meat counter', 'coffee shop barista espresso',
  'lawyer office law books', 'yoga class studio', 'roofer working on roof', 'locksmith lock door', 'pastry chef croissants',
];

function queriesOf(value: unknown): string[] {
  return collectStrings(value).filter((entry) => entry.path.endsWith('.query')).map((entry) => entry.text);
}

async function main() {
  loadEnv();
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error('UNSPLASH_ACCESS_KEY est absente de .env.local.');
  // ENRICH=1 : ajoute les requêtes de scripts/photo-queries.ts à la bibliothèque existante (les requêtes déjà présentes sont ignorées,
  // la progression est enregistrée après chaque requête : relancer après la réinitialisation horaire du quota reprend où l'on s'est arrêté).
  const enrich = process.env.ENRICH === '1';
  const overrides: Record<string, string> = JSON.parse(process.env.QUERY_OVERRIDES ?? '{}');
  const queries = new Set<string>(enrich ? libraryQueries : tradeQueries);
  if (!enrich) {
    for (const sample of samples) queriesOf(sample.site).forEach((query) => queries.add(query));
    for (const type of sectionTypes) for (const variant of sectionVariants[type]) queriesOf(catalogueSection(type, variant)).forEach((query) => queries.add(query));
  }
  const provider = new UnsplashProvider(key);
  const library: Record<string, unknown[]> = enrich && existsSync('src/lib/photos/library.json') ? JSON.parse(readFileSync('src/lib/photos/library.json', 'utf8')) : {};
  const samplePhotos: Record<string, unknown> = {};
  let done = 0;
  for (const query of queries) {
    if (enrich && library[query]) continue;
    const searched = overrides[query] ?? query;
    const { candidates, remaining } = await provider.search(searched);
    const ranked = rankCandidates(candidates, searched, enrich ? 6 : 3, { trusted: true });
    if (ranked.length === 0) console.warn(`Aucun résultat pertinent pour « ${query} »`);
    else {
      library[query] = ranked.map(({ downloadLocation, ...photo }) => { void downloadLocation; return photo; });
      const { downloadLocation, description, tags, ...first } = ranked[0];
      void downloadLocation; void description; void tags;
      samplePhotos[query] = first;
      console.log(`${query} → ${ranked.length} photos, ${ranked[0].alt.slice(0, 50)} (reste ${remaining})`);
    }
    done += 1;
    if (enrich) writeFileSync('src/lib/photos/library.json', `${JSON.stringify(library, null, 2)}\n`);
    if (remaining !== undefined && remaining <= 6) {
      console.warn('QUOTA_ATTEINT : quota Unsplash presque épuisé, arrêt.');
      if (!enrich) break;
      process.exitCode = 3;
      return;
    }
  }
  if (!enrich) {
    writeFileSync('src/lib/photos/library.json', `${JSON.stringify(library, null, 2)}\n`);
    writeFileSync('src/lib/site/sample-photos.json', `${JSON.stringify(samplePhotos, null, 2)}\n`);
  }
  console.log(`${Object.keys(library).length} requêtes dans la bibliothèque (${done} nouvelles).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
