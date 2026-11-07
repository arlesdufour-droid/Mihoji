import 'server-only';

import { and, asc, eq, sql } from 'drizzle-orm';
import sharp, { type OutputInfo } from 'sharp';
import { getDb } from '@/db/client';
import { sitePhotos } from '@/db/schema';
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, MAX_USER_PHOTOS, type PhotoKind, type UserPhoto } from './user-photos';

export type StoredPhoto = UserPhoto & { createdAt: Date };

export async function listUserPhotos(workspaceId: string): Promise<StoredPhoto[]> {
  const rows = await getDb().select({ id: sitePhotos.id, kind: sitePhotos.kind, alt: sitePhotos.alt, createdAt: sitePhotos.createdAt }).from(sitePhotos).where(eq(sitePhotos.workspaceId, workspaceId)).orderBy(asc(sitePhotos.createdAt));
  return rows;
}

export type UploadResult = { ok: true; photo: StoredPhoto } | { ok: false; error: 'unsupported_type' | 'too_large' | 'too_many' | 'unreadable' };

// Redimensionne (1600 px au plus), corrige l'orientation, retire les métadonnées (position GPS comprise) et enregistre en WebP.
export async function saveUserPhoto(input: { workspaceId: string; kind: PhotoKind; alt: string; bytes: Buffer; mime: string }): Promise<UploadResult> {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(input.mime)) return { ok: false, error: 'unsupported_type' };
  if (input.bytes.length > MAX_UPLOAD_BYTES) return { ok: false, error: 'too_large' };
  const [{ count }] = await getDb().select({ count: sql<number>`count(*)::int` }).from(sitePhotos).where(eq(sitePhotos.workspaceId, input.workspaceId));
  if (count >= MAX_USER_PHOTOS) return { ok: false, error: 'too_many' };
  let processed: { data: Buffer; info: OutputInfo };
  try {
    processed = await sharp(input.bytes, { limitInputPixels: 80_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  } catch {
    return { ok: false, error: 'unreadable' };
  }
  const [row] = await getDb().insert(sitePhotos).values({ workspaceId: input.workspaceId, kind: input.kind, alt: input.alt.trim().slice(0, 160), mime: 'image/webp', data: processed.data, width: processed.info.width, height: processed.info.height }).returning({ id: sitePhotos.id, kind: sitePhotos.kind, alt: sitePhotos.alt, createdAt: sitePhotos.createdAt });
  return { ok: true, photo: row };
}

export async function deleteUserPhoto(workspaceId: string, id: string): Promise<boolean> {
  const rows = await getDb().delete(sitePhotos).where(and(eq(sitePhotos.id, id), eq(sitePhotos.workspaceId, workspaceId))).returning({ id: sitePhotos.id });
  return rows.length > 0;
}

export async function readUserPhoto(id: string): Promise<{ data: Buffer; mime: string } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await getDb().select({ data: sitePhotos.data, mime: sitePhotos.mime }).from(sitePhotos).where(eq(sitePhotos.id, id)).limit(1);
  return row ?? null;
}
