import type { SiteDescription } from '../site/schema';
import type { PhotoCandidate } from './types';

// Attribution des photos aux emplacements d'un site (logique pure, testée).
// Chaque emplacement avec une requête et sans image reçoit la meilleure photo de sa requête ;
// une même photo n'est jamais utilisée deux fois dans un site (galeries : on prend la suivante du classement).

type Slot = { query?: string; src?: string; alt: string; credit?: { name: string; url: string } };

export function imageSlots(site: SiteDescription): Slot[] {
  const slots: Slot[] = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (typeof record.query === 'string' && typeof record.alt === 'string') slots.push(record as Slot);
      else Object.values(record).forEach(walk);
    }
  };
  walk(site.pages);
  return slots;
}

export function assignPhotos(site: SiteDescription, library: Map<string, PhotoCandidate[]>, normalize: (query: string) => string): { site: SiteDescription; used: PhotoCandidate[]; missing: string[] } {
  const next = structuredClone(site);
  const taken = new Set<string>();
  const used: PhotoCandidate[] = [];
  const missing = new Set<string>();
  for (const slot of imageSlots(next)) {
    if (slot.src || !slot.query) continue;
    const candidates = library.get(normalize(slot.query)) ?? [];
    const photo = candidates.find((candidate) => !taken.has(candidate.src));
    if (!photo) {
      missing.add(slot.query);
      continue;
    }
    taken.add(photo.src);
    used.push(photo);
    slot.src = photo.src;
    slot.credit = photo.credit;
  }
  return { site: next, used, missing: [...missing] };
}
