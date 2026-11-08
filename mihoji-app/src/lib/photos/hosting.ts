import 'server-only';

import { and, eq } from 'drizzle-orm';
import sharp from 'sharp';
import { getDb } from '@/db/client';
import { hostedPhotos } from '@/db/schema';
import type { SiteDescription } from '../site/schema';
import { siteSchema } from '../site/schema';
import { isPixabayUrl } from './pixabay';
import type { PhotoCandidate } from './types';
import { sniffImageType } from './verify';

// Hébergement des photos Pixabay retenues (conditions de l'API) : téléchargées une seule fois, stockées en base, servies par
// /api/hosted-photos/<id> avec le crédit du photographe. Si un téléchargement échoue, l'emplacement redevient un visuel graphique :
// on n'affiche jamais une image depuis les serveurs de Pixabay.
const MAX_BYTES = 6 * 1024 * 1024;
export const hostedPhotoUrl = (id: string) => `/api/hosted-photos/${id}`;

async function hostOne(photo: PhotoCandidate): Promise<string | null> {
  const sourceId = photo.sourceId ?? photo.src;
  const db = getDb();
  const [known] = await db.select({ id: hostedPhotos.id }).from(hostedPhotos).where(and(eq(hostedPhotos.source, 'pixabay'), eq(hostedPhotos.sourceId, sourceId))).limit(1);
  if (known) return hostedPhotoUrl(known.id);
  const response = await fetch(photo.src, { signal: AbortSignal.timeout(20_000) });
  const mime = response.headers.get('content-type')?.split(';')[0] ?? '';
  if (!response.ok || !/^image\/(jpeg|png|webp)$/.test(mime)) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return null;
  // Stockage économe (offre gratuite de Supabase : 500 Mo) : 1600 px au plus et WebP, environ deux fois plus léger que l'original ; en cas d'échec, l'original est conservé.
  let stored = { data: bytes, mime: sniffImageType(bytes) ?? mime };
  try {
    stored = { data: await sharp(bytes, { limitInputPixels: 80_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer(), mime: 'image/webp' };
  } catch (error) {
    console.warn('Hosted photo kept as downloaded (compression failed).', error instanceof Error ? error.message : error);
  }
  const [row] = await db.insert(hostedPhotos).values({ source: 'pixabay', sourceId, mime: stored.mime, data: stored.data, creditName: photo.credit.name, creditUrl: photo.credit.url })
    .onConflictDoUpdate({ target: [hostedPhotos.source, hostedPhotos.sourceId], set: { mime: stored.mime } }).returning({ id: hostedPhotos.id });
  return hostedPhotoUrl(row.id);
}

export async function readHostedPhoto(id: string): Promise<{ data: Buffer; mime: string } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await getDb().select({ data: hostedPhotos.data, mime: hostedPhotos.mime }).from(hostedPhotos).where(eq(hostedPhotos.id, id)).limit(1);
  // Le type annoncé par le fournisseur est parfois faux (PNG pour un JPEG) : on sert le type réel.
  return row ? { data: row.data, mime: sniffImageType(row.data) ?? row.mime } : null;
}

// Remplace dans le site chaque adresse Pixabay par la copie hébergée. Retourne le site et le nombre de photos retirées faute de téléchargement.
export async function hostPixabayPhotos(site: SiteDescription, used: PhotoCandidate[]): Promise<{ site: SiteDescription; hosted: number; failed: number }> {
  const targets = used.filter((photo) => isPixabayUrl(photo.src));
  if (targets.length === 0) return { site, hosted: 0, failed: 0 };
  const urls = new Map<string, string | null>();
  for (const photo of targets) {
    try { urls.set(photo.src, await hostOne(photo)); } catch (error) { console.warn('Pixabay download failed.', error instanceof Error ? error.message : error); urls.set(photo.src, null); }
  }
  const next = structuredClone(site);
  const walk = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (typeof record.src === 'string' && urls.has(record.src)) {
        const hosted = urls.get(record.src);
        if (hosted) record.src = hosted;
        else { delete record.src; delete record.credit; }
      } else Object.values(record).forEach(walk);
    }
  };
  walk(next.pages);
  const failed = [...urls.values()].filter((value) => !value).length;
  return { site: siteSchema.parse(next), hosted: urls.size - failed, failed };
}
