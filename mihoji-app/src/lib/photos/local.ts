import library from './library.json';
import { normalizeQuery, queryWords } from './select';
import type { PhotoCandidate, PhotoProvider, PhotoSearchResult } from './types';

// Bibliothèque locale de photos libres (Unsplash) par métier, produite par scripts/fetch-photo-library.ts.
// Repli quand la clé Unsplash est absente, que le quota horaire est épuisé ou qu'une recherche échoue.
const entries = library as Record<string, PhotoCandidate[]>;

export class LocalLibraryProvider implements PhotoProvider {
  readonly name = 'local' as const;

  async search(query: string): Promise<PhotoSearchResult> {
    const words = queryWords(query);
    const ranked = Object.entries(entries)
      .map(([key, photos]) => {
        const keyWords = queryWords(key);
        const shared = words.filter((word) => keyWords.includes(word)).length;
        return { photos, score: shared / Math.max(words.length, 1) + (normalizeQuery(key) === normalizeQuery(query) ? 1 : 0) };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
    return { candidates: ranked.slice(0, 3).flatMap((entry) => entry.photos.map((photo) => ({ ...photo, downloadLocation: undefined }))) };
  }
}
