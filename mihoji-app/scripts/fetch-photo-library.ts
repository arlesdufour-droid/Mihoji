import { writeFileSync } from 'node:fs';
import { loadEnv } from './e2e-guard';
import { catalogueSection, samples } from '../src/lib/site/samples';
import { collectStrings, sectionTypes, sectionVariants } from '../src/lib/site/schema';
import { rankCandidates } from '../src/lib/photos/select';
import { UnsplashProvider } from '../src/lib/photos/unsplash';

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
  const overrides: Record<string, string> = JSON.parse(process.env.QUERY_OVERRIDES ?? '{}');
  const queries = new Set<string>(tradeQueries);
  for (const sample of samples) queriesOf(sample.site).forEach((query) => queries.add(query));
  for (const type of sectionTypes) for (const variant of sectionVariants[type]) queriesOf(catalogueSection(type, variant)).forEach((query) => queries.add(query));
  const provider = new UnsplashProvider(key);
  const library: Record<string, unknown[]> = {};
  const samplePhotos: Record<string, unknown> = {};
  for (const query of queries) {
    const searched = overrides[query] ?? query;
    const { candidates, remaining } = await provider.search(searched);
    const ranked = rankCandidates(candidates, searched, 3);
    if (ranked.length === 0) console.warn(`Aucun résultat pertinent pour « ${query} »`);
    else {
      library[query] = ranked.map(({ downloadLocation, ...photo }) => { void downloadLocation; return photo; });
      const { downloadLocation, description, tags, ...first } = ranked[0];
      void downloadLocation; void description; void tags;
      samplePhotos[query] = first;
      console.log(`${query} → ${ranked[0].alt.slice(0, 60)} (reste ${remaining})`);
    }
    if (remaining !== undefined && remaining <= 6) {
      console.warn('Quota Unsplash presque épuisé : arrêt. Relancer plus tard (les requêtes déjà traitées sont rejouées : utiliser KEEP=1).');
      break;
    }
  }
  writeFileSync('src/lib/photos/library.json', `${JSON.stringify(library, null, 2)}\n`);
  writeFileSync('src/lib/site/sample-photos.json', `${JSON.stringify(samplePhotos, null, 2)}\n`);
  console.log(`${Object.keys(library).length} requêtes sur ${queries.size}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
