import type { SiteDescription } from '../site/schema';
import type { PhotoCandidate } from './types';

// Attribution des photos aux emplacements d'un site (logique pure, testée).
// Chaque emplacement avec une requête et sans image reçoit la meilleure photo de sa requête ;
// une même photo n'est jamais utilisée deux fois dans un site (galeries : on prend la suivante du classement).

type Slot = { query?: string; alternatives?: string[]; src?: string; alt: string; credit?: { name: string; url: string } };

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

// Emplacements à remplir (requête, pas encore d'image), dans l'ordre de la page ; les objets sont ceux du site passé en argument.
export function pendingSlots(site: SiteDescription): Slot[] {
  return imageSlots(site).filter((slot) => slot.query && !slot.src);
}

// Attribue à chaque emplacement la première photo acceptable qui n'est pas déjà prise (choices[i] : candidates acceptables de l'emplacement i, meilleure d'abord).
export function assignSlots(site: SiteDescription, choices: PhotoCandidate[][]): { site: SiteDescription; used: PhotoCandidate[]; missing: string[] } {
  const next = structuredClone(site);
  const taken = new Set(imageSlots(next).map((slot) => slot.src).filter(Boolean) as string[]);
  const used: PhotoCandidate[] = [];
  const missing: string[] = [];
  pendingSlots(next).forEach((slot, index) => {
    const photo = (choices[index] ?? []).find((candidate) => !taken.has(candidate.src));
    if (!photo) { missing.push(slot.query as string); return; }
    taken.add(photo.src);
    used.push(photo);
    slot.src = photo.src;
    slot.credit = photo.credit;
  });
  return { site: next, used, missing };
}
