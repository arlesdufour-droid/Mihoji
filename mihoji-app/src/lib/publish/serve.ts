import 'server-only';

import { and, eq } from 'drizzle-orm';
import { cacheLife, cacheTag } from 'next/cache';
import { getDb } from '@/db/client';
import { customDomains, publishedSites } from '@/db/schema';
import { activeCustomHostname, siteTag, subdomainOrigin } from './store';
import { isPublishedSnapshot, renderSnapshotFiles, withSeo } from './snapshot';

export type ServedSite =
  | { state: 'live'; projectId: string; files: Record<string, string>; assetOrigin: string | null }
  | { state: 'unavailable'; reason: 'unpublished' | 'blocked' }
  | { state: 'redirect'; to: string }
  | { state: 'unknown' };

// Site à servir pour une clé (sous-domaine, ou nom de domaine complet d'un domaine personnalisé vérifié).
// Résultat mis en cache (rendu compris) : aucune visite ne déclenche de rendu. Le cache est invalidé par étiquette à chaque publication,
// dépublication, blocage, changement d'adresse ou de domaine (voir store.ts : invalidateSiteKeys).
export async function loadServedSite(key: string, devOrigin: string | null): Promise<ServedSite> {
  'use cache';
  cacheTag(siteTag(key));
  cacheLife({ stale: 30, revalidate: 300, expire: 86_400 });
  const db = getDb();
  let projectId: string | null = null;
  if (key.includes('.')) {
    const [domain] = await db.select({ projectId: customDomains.projectId, redirectTo: customDomains.redirectTo }).from(customDomains).where(and(eq(customDomains.hostname, key), eq(customDomains.status, 'verified'))).limit(1);
    if (domain?.redirectTo) return { state: 'redirect', to: domain.redirectTo };
    projectId = domain?.projectId ?? null;
  }
  const [site] = projectId
    ? await db.select().from(publishedSites).where(eq(publishedSites.projectId, projectId)).limit(1)
    : key.includes('.') ? [] : await db.select().from(publishedSites).where(eq(publishedSites.subdomain, key)).limit(1);
  if (!site) { cacheLife({ stale: 15, revalidate: 30, expire: 300 }); return { state: 'unknown' }; }
  if (site.status !== 'live') return { state: 'unavailable', reason: site.status === 'blocked' ? 'blocked' : 'unpublished' };
  if (!isPublishedSnapshot(site.snapshot)) return { state: 'unknown' };
  const primary = await activeCustomHostname(site.projectId);
  const canonicalOrigin = primary ? `https://${primary}` : subdomainOrigin(site.subdomain, devOrigin);
  return { state: 'live', projectId: site.projectId, files: withSeo(renderSnapshotFiles(site.snapshot), canonicalOrigin), assetOrigin: site.snapshot.assetOrigin };
}
