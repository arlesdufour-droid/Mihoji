import { describe, expect, it } from 'vitest';
import { assignPhotos, imageSlots } from './assign';
import library from './library.json';
import { LocalLibraryProvider } from './local';
import { normalizeQuery, queryWords, rankCandidates, scoreCandidate } from './select';
import { siteSchema } from '../site/schema';
import { samples } from '../site/samples';
import type { PhotoCandidate } from './types';

const photo = (src: string, alt: string, extra: Partial<PhotoCandidate> = {}): PhotoCandidate => ({ src, alt, description: '', tags: [], credit: { name: 'A', url: 'https://unsplash.com/@a' }, ...extra });

describe('sélection de photos', () => {
  it('normalise les requêtes', () => {
    expect(normalizeQuery('  Boulangerie, PAIN!  ')).toBe('boulangerie pain');
    expect(queryWords('lawyer reviewing contracts at the desk')).toContain('contract');
  });

  it('écarte le drapeau américain pour un cabinet d’avocats et retient le contrat', () => {
    const results = [
      photo('https://images.unsplash.com/a', 'Elegant office with american flag and presidential desk', { tags: ['office', 'flag'] }),
      photo('https://images.unsplash.com/b', 'Business people signing a contract at a table', { tags: ['law', 'contract'] }),
    ];
    const ranked = rankCandidates(results, 'law office contract desk');
    expect(ranked[0].src).toBe('https://images.unsplash.com/b');
    expect(ranked.map((entry) => entry.src)).not.toContain('https://images.unsplash.com/a');
  });

  it('n’écarte pas un motif quand la requête le demande', () => {
    const flag = photo('https://images.unsplash.com/a', 'flag on a pole');
    expect(scoreCandidate(flag, 'flag pole')).toBeGreaterThan(2);
  });

  it('préfère la photo qui couvre tous les mots de la requête', () => {
    const partial = photo('https://images.unsplash.com/a', 'a kitchen interior');
    const full = photo('https://images.unsplash.com/b', 'baker kneading dough in a bakery');
    expect(rankCandidates([partial, full], 'baker kneading dough bakery')[0].src).toBe(full.src);
  });

  it('renvoie une liste vide quand rien ne correspond', () => {
    expect(rankCandidates([photo('https://images.unsplash.com/a', 'mountain landscape')], 'plumber fixing sink')).toEqual([]);
  });
});

describe('attribution aux emplacements', () => {
  const site = siteSchema.parse(samples.find((sample) => sample.id === 'coach')?.site);
  it('liste les emplacements et ne réutilise jamais une photo dans un site', () => {
    const queries = imageSlots(site).map((slot) => slot.query);
    expect(queries.length).toBeGreaterThan(3);
    const two = [photo('https://images.unsplash.com/1', 'x'), photo('https://images.unsplash.com/2', 'y')];
    const map = new Map<string, PhotoCandidate[]>(queries.filter(Boolean).map((query) => [normalizeQuery(query!), two]));
    const { site: out, used } = assignPhotos(site, map, normalizeQuery);
    const srcs = imageSlots(out).map((slot) => slot.src).filter(Boolean);
    expect(new Set(srcs).size).toBe(srcs.length);
    expect(used.length).toBe(srcs.length);
  });

  it('signale les requêtes sans photo', () => {
    const { missing } = assignPhotos(site, new Map(), normalizeQuery);
    expect(missing.length).toBeGreaterThan(0);
  });
});

describe('bibliothèque locale', () => {
  it('contient des photos HTTPS avec crédit', () => {
    const photos = Object.values(library as Record<string, PhotoCandidate[]>).flat();
    expect(photos.length).toBeGreaterThan(20);
    for (const entry of photos) {
      expect(entry.src).toMatch(/^https:\/\/images\.unsplash\.com\//);
      expect(entry.credit.name).toBeTruthy();
    }
  });

  it('trouve une photo pour un métier connu sans réseau', async () => {
    const { candidates } = await new LocalLibraryProvider().search('florist arranging flowers');
    expect(rankCandidates(candidates, 'florist arranging flowers').length).toBeGreaterThan(0);
  });
});

describe('requêtes simplifiées', () => {
  it('raccourcit une requête trop précise en gardant le métier', async () => {
    const { simplerQueries } = await import('./select');
    expect(simplerQueries('Plumber fixing sink pipe')).toEqual(['plumber fixing sink', 'plumber fixing']);
    expect(simplerQueries('bakery bread')).toEqual([]);
  });
});
