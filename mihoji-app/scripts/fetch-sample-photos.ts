import { writeFileSync } from 'node:fs';
import { loadEnv } from './e2e-guard';
import { catalogueSection, samples } from '../src/lib/site/samples';
import { collectStrings, sectionTypes, sectionVariants } from '../src/lib/site/schema';

// Récupère une photo Unsplash par requête utilisée dans les sites d'exemple et le catalogue (administration du design uniquement).
// Les URL, le nom du photographe et le lien de téléchargement sont conservés pour respecter les règles d'attribution d'Unsplash.
// Usage : npx tsx scripts/fetch-sample-photos.ts   (UNSPLASH_ACCESS_KEY dans .env.local)

type Photo = { src: string; alt: string; credit: { name: string; url: string } };

const overrides: Record<string, string> = JSON.parse(process.env.QUERY_OVERRIDES ?? '{}');

function queriesOf(value: unknown): string[] {
  return collectStrings(value).filter((entry) => entry.path.endsWith('.query')).map((entry) => entry.text);
}

async function search(query: string, key: string): Promise<Photo | null> {
  const url = `https://api.unsplash.com/search/photos?${new URLSearchParams({ query: overrides[query] ?? query, per_page: '12', orientation: 'landscape', content_filter: 'high' })}`;
  const response = await fetch(url, { headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' } });
  if (!response.ok) throw new Error(`Unsplash ${response.status} pour « ${query} »`);
  const data = await response.json() as { results: { urls: { raw: string }; alt_description: string | null; description: string | null; tags?: { title: string }[]; user: { name: string; links: { html: string } } }[] };
  // Le premier résultat n'est pas toujours pertinent : on retient la première photo dont la description évoque la requête.
  const words = (overrides[query] ?? query).toLowerCase().split(/\s+/).filter((word) => word.length > 3);
  const relevant = (hit: (typeof data.results)[number]) => {
    const text = `${hit.alt_description ?? ''} ${hit.description ?? ''} ${(hit.tags ?? []).map((tag) => tag.title).join(' ')}`.toLowerCase();
    return words.some((word) => text.includes(word.replace(/s$/, '')));
  };
  const hit = data.results.find(relevant) ?? data.results[0];
  if (!hit) return null;
  return { src: hit.urls.raw.split('?')[0], alt: hit.alt_description ?? query, credit: { name: hit.user.name, url: `${hit.user.links.html}?utm_source=mihoji&utm_medium=referral` } };
}

async function main() {
  loadEnv();
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error('UNSPLASH_ACCESS_KEY est absente de .env.local.');
  const queries = new Set<string>();
  for (const sample of samples) queriesOf(sample.site).forEach((query) => queries.add(query));
  for (const type of sectionTypes) for (const variant of sectionVariants[type]) queriesOf(catalogueSection(type, variant)).forEach((query) => queries.add(query));
  const result: Record<string, Photo> = {};
  for (const query of queries) {
    const photo = await search(query, key);
    if (photo) result[query] = photo;
    else console.warn(`Aucun résultat pour « ${query} »`);
  }
  writeFileSync('src/lib/site/sample-photos.json', `${JSON.stringify(result, null, 2)}\n`);
  console.log(`${Object.keys(result).length} photos sur ${queries.size} requêtes.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
