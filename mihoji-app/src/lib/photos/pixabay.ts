import type { PhotoCandidate, PhotoProvider, PhotoSearchResult } from './types';

type Hit = {
  id: number;
  pageURL: string;
  tags: string;
  webformatURL: string;
  largeImageURL: string;
  user: string;
  user_id: number;
};

// Pixabay (https://pixabay.com/api/docs/) : 100 requêtes par minute. Conditions de l'API : les images doivent être téléchargées et
// hébergées par nous (jamais affichées depuis les serveurs de Pixabay) et les résultats mis en cache. Voir photos/hosting.ts.
export class PixabayProvider implements PhotoProvider {
  readonly name = 'pixabay' as const;

  constructor(private readonly apiKey: string) {}

  async search(query: string, signal?: AbortSignal): Promise<PhotoSearchResult> {
    const params = new URLSearchParams({ key: this.apiKey, q: query.slice(0, 100), lang: 'en', image_type: 'photo', orientation: 'horizontal', safesearch: 'true', min_width: '1000', per_page: '20' });
    const response = await fetch(`https://pixabay.com/api/?${params}`, { signal });
    if (!response.ok) throw new Error(`pixabay_${response.status}`);
    const data = await response.json() as { hits?: Hit[] };
    const remaining = Number(response.headers.get('x-ratelimit-remaining'));
    return { candidates: (data.hits ?? []).map(toCandidate), remaining: Number.isFinite(remaining) ? remaining : undefined };
  }
}

export function toCandidate(hit: Hit): PhotoCandidate {
  const tags = hit.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  return {
    src: hit.largeImageURL,
    alt: tags.join(', '),
    description: tags.join(', '),
    tags,
    credit: { name: hit.user, url: `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${hit.user_id}/` },
    previewUrl: hit.webformatURL,
    sourceId: String(hit.id),
  };
}

export const isPixabayUrl = (src: string): boolean => {
  try { return new URL(src).hostname.endsWith('pixabay.com'); } catch { return false; }
};
