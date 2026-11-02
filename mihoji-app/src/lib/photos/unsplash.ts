import type { PhotoCandidate, PhotoProvider, PhotoSearchResult } from './types';

type Hit = {
  urls: { raw: string };
  alt_description: string | null;
  description: string | null;
  tags?: { title: string }[];
  links?: { download_location?: string };
  user: { name: string; links: { html: string } };
};

const REFERRAL = 'utm_source=mihoji&utm_medium=referral';

export class UnsplashProvider implements PhotoProvider {
  readonly name = 'unsplash' as const;

  constructor(private readonly accessKey: string) {}

  async search(query: string, signal?: AbortSignal): Promise<PhotoSearchResult> {
    const params = new URLSearchParams({ query, per_page: '20', orientation: 'landscape', content_filter: 'high' });
    const response = await fetch(`https://api.unsplash.com/search/photos?${params}`, { headers: { Authorization: `Client-ID ${this.accessKey}`, 'Accept-Version': 'v1' }, signal });
    if (!response.ok) throw new Error(`unsplash_${response.status}`);
    const data = await response.json() as { results: Hit[] };
    const remaining = Number(response.headers.get('x-ratelimit-remaining'));
    return { candidates: data.results.map(toCandidate), remaining: Number.isFinite(remaining) ? remaining : undefined };
  }

  // Règle d'Unsplash : signaler le téléchargement quand la photo est effectivement utilisée.
  async trackDownload(location: string): Promise<void> {
    if (!location.startsWith('https://api.unsplash.com/')) return;
    await fetch(location, { headers: { Authorization: `Client-ID ${this.accessKey}`, 'Accept-Version': 'v1' } }).catch(() => undefined);
  }
}

export function toCandidate(hit: Hit): PhotoCandidate {
  return {
    src: hit.urls.raw.split('?')[0],
    alt: hit.alt_description ?? hit.description ?? '',
    description: hit.description ?? '',
    tags: (hit.tags ?? []).map((tag) => tag.title),
    credit: { name: hit.user.name, url: `${hit.user.links.html}?${REFERRAL}` },
    downloadLocation: hit.links?.download_location,
  };
}
