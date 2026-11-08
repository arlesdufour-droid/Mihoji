import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { describe, expect, it } from 'vitest';
import { photoCache } from '@/db/schema';

const SOURCES = ['unsplash', 'pixabay', 'local'] as const;

// Dernière contrainte photo_cache_source_check définie par les migrations (ordre alphabétique = ordre d'application).
function lastAllowedSources(): string[] {
  const dir = join(process.cwd(), 'db/migrations');
  let allowed: string[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(dir, file), 'utf8');
    const inline = sql.match(/"source" text NOT NULL CHECK \("source" IN \(([^)]*)\)\)/);
    const added = sql.match(/ADD CONSTRAINT "photo_cache_source_check" CHECK \("source" IN \(([^)]*)\)\)/);
    const found = added ?? inline;
    if (found) allowed = [...found[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  }
  return allowed;
}

function databaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const line = readFileSync('.env.local', 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
    return line?.slice('DATABASE_URL='.length).replace(/^(['"])(.*)\1$/, '$2');
  } catch { return undefined; }
}

describe('cache des photos : sources autorisées', () => {
  it('les migrations autorisent chaque source du schéma, Pixabay compris', () => {
    expect(lastAllowedSources().sort()).toEqual([...SOURCES].sort());
  });

  const url = databaseUrl();
  it.skipIf(!url)('une photo Pixabay est réellement mise en cache dans la base de développement', async () => {
    const client = postgres(url!, { prepare: false, max: 1 });
    const db = drizzle(client);
    const key = `test-pixabay-cache-${Date.now()}`;
    const candidates = [{ src: 'https://pixabay.com/get/x_1280.jpg', alt: 'bread, bakery', source: 'pixabay' }];
    try {
      // Même requête que `store()` dans service.ts.
      await db.insert(photoCache).values({ query: key, source: 'pixabay', candidates }).onConflictDoUpdate({ target: photoCache.query, set: { source: 'pixabay', candidates } });
      const [row] = await db.select().from(photoCache).where(eq(photoCache.query, key));
      expect(row.source).toBe('pixabay');
      expect(row.candidates).toEqual(candidates);
    } finally {
      await db.delete(photoCache).where(eq(photoCache.query, key));
      await client.end();
    }
  });
});

import { sniffImageType } from './verify';

describe('type réel des images', () => {
  it('reconnaît un JPEG même si le serveur annonce du PNG', () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe('image/jpeg');
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe('image/png');
    expect(sniffImageType(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp');
    expect(sniffImageType(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

import { unsplashAllowed } from './rate-window';

describe('Unsplash en secours', () => {
  it('est plafonné par site et par quota horaire, sans jamais attendre', () => {
    expect(unsplashAllowed(40, 0, 4)).toBe(true);
    expect(unsplashAllowed(40, 4, 4)).toBe(false);
    expect(unsplashAllowed(0, 0, 4)).toBe(false);
  });
});

import { legacyVerifySystemPrompt, verifyPhotos, verifySystemPrompt } from './verify';

describe('contrôle visuel des photos : consigne', () => {
  const candidate = { src: 'https://images.unsplash.com/photo-1?w=800', alt: 'x', tags: [], credit: { name: 'a', url: 'https://unsplash.com' } } as never;
  const fakeClient = (seen: { system?: string }) => ({ messages: { create: async (body: { system: string }) => { seen.system = body.system; return { content: [{ type: 'text', text: '{"slots":[{"id":0,"accepted":["A"]}]}' }], usage: { input_tokens: 10, output_tokens: 5 } }; } } }) as never;
  it('la consigne actuelle est plus indulgente que l’ancienne mais refuse toujours les autres métiers et les textes lisibles', () => {
    expect(verifySystemPrompt).toContain('En cas de doute entre accepter et refuser, accepte');
    expect(verifySystemPrompt).toContain('Le métier doit être le bon');
    expect(verifySystemPrompt).toContain('un texte lisible');
    expect(legacyVerifySystemPrompt).toContain('trop abstraite, sombre ou floue');
    expect(verifySystemPrompt).not.toContain('trop abstraite, sombre ou floue');
  });
  it('utilise la consigne actuelle par défaut, ou celle qu’on lui donne (audit avant/après)', async () => {
    const seen: { system?: string } = {};
    await verifyPhotos([{ id: 0, subject: 's', candidates: [candidate] }], { client: fakeClient(seen) });
    expect(seen.system).toBe(verifySystemPrompt);
    await verifyPhotos([{ id: 0, subject: 's', candidates: [candidate] }], { client: fakeClient(seen), systemPrompt: legacyVerifySystemPrompt });
    expect(seen.system).toBe(legacyVerifySystemPrompt);
  });
});
