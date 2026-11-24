import 'server-only';

import { and, eq, like, or } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';
import { getDb } from '@/db/client';
import { customDomains, publishedSites } from '@/db/schema';
import { devSitePathEnabled, isProductionEnvironment, publishedDomain } from './config';
import { suggestSubdomain, validateSubdomain, type SubdomainProblem } from './slug';
import type { PublishedSnapshot } from './snapshot';

// Cache des pages publiées : une entrée par clé de site (sous-domaine ou domaine personnalisé), invalidée par étiquette à chaque publication.
export const siteTag = (key: string) => `site-key:${key}`;

export function invalidateSiteKeys(keys: readonly string[]) {
  for (const key of new Set(keys)) revalidateTag(siteTag(key), { expire: 0 });
}

// Toutes les clés qui servent un projet : son sous-domaine (actuel et éventuel ancien) et ses domaines personnalisés.
export async function siteKeysOfProject(projectId: string, extra: readonly string[] = []): Promise<string[]> {
  const db = getDb();
  const [site] = await db.select({ subdomain: publishedSites.subdomain }).from(publishedSites).where(eq(publishedSites.projectId, projectId)).limit(1);
  const domains = await db.select({ hostname: customDomains.hostname }).from(customDomains).where(eq(customDomains.projectId, projectId));
  return [...(site ? [site.subdomain] : []), ...domains.map((domain) => domain.hostname), ...extra];
}

export async function invalidateProject(projectId: string, extra: readonly string[] = []) {
  invalidateSiteKeys(await siteKeysOfProject(projectId, extra));
}

export type PublishedSiteRow = typeof publishedSites.$inferSelect;

export async function getPublishedSite(projectId: string): Promise<PublishedSiteRow | null> {
  const [row] = await getDb().select().from(publishedSites).where(eq(publishedSites.projectId, projectId)).limit(1);
  return row ?? null;
}

const isUniqueViolation = (error: unknown) => (error as { code?: string; cause?: { code?: string } })?.code === '23505' || (error as { cause?: { code?: string } })?.cause?.code === '23505';

// Publie (ou republie) un site : première fois, il reçoit un sous-domaine dérivé du nom de l'entreprise, libre et valide ; ensuite, il le garde.
export async function upsertPublishedSite(input: { projectId: string; versionId: string; companyName: string; snapshot: PublishedSnapshot }): Promise<{ subdomain: string; status: PublishedSiteRow['status'] }> {
  const db = getDb();
  const existing = await getPublishedSite(input.projectId);
  if (existing) {
    await db.update(publishedSites).set({ versionId: input.versionId, snapshot: input.snapshot, status: 'live', publishedAt: new Date(), updatedAt: new Date() }).where(eq(publishedSites.projectId, input.projectId));
    await invalidateProject(input.projectId);
    return { subdomain: existing.subdomain, status: 'live' };
  }
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const base = suggestSubdomain(input.companyName);
    const taken = new Set((await db.select({ subdomain: publishedSites.subdomain }).from(publishedSites).where(or(eq(publishedSites.subdomain, base), like(publishedSites.subdomain, `${base.slice(0, 36)}-%`)))).map((row) => row.subdomain));
    const subdomain = suggestSubdomain(input.companyName, taken);
    try {
      await db.insert(publishedSites).values({ projectId: input.projectId, subdomain, versionId: input.versionId, status: 'live', snapshot: input.snapshot });
      invalidateSiteKeys([subdomain]);
      return { subdomain, status: 'live' };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error; // deux publications simultanées ont choisi la même adresse : on recalcule
    }
  }
  throw new Error('subdomain_allocation_failed');
}

export type RenameResult = { ok: true; subdomain: string } | { ok: false; error: SubdomainProblem | 'prise' | 'site_introuvable' };

// Modifier l'adresse d'un site publié : forme valide, mot non réservé, unicité garantie par la base (contrainte unique).
export async function renameSubdomain(projectId: string, requested: string): Promise<RenameResult> {
  const subdomain = requested.trim().toLowerCase();
  const problem = validateSubdomain(subdomain);
  if (problem) return { ok: false, error: problem };
  const existing = await getPublishedSite(projectId);
  if (!existing) return { ok: false, error: 'site_introuvable' };
  if (existing.subdomain === subdomain) return { ok: true, subdomain };
  try {
    await getDb().update(publishedSites).set({ subdomain, updatedAt: new Date() }).where(eq(publishedSites.projectId, projectId));
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: 'prise' };
    throw error;
  }
  await invalidateProject(projectId, [existing.subdomain]);
  return { ok: true, subdomain };
}

// Dépublication : « unpublished » (choix du propriétaire) ou « blocked » (anti-abus, administrateur). Le site répond alors « indisponible ».
export async function setPublishedStatus(projectId: string, status: 'live' | 'unpublished' | 'blocked'): Promise<boolean> {
  const rows = await getDb().update(publishedSites).set({ status, updatedAt: new Date() }).where(eq(publishedSites.projectId, projectId)).returning({ projectId: publishedSites.projectId });
  if (rows.length > 0) await invalidateProject(projectId);
  return rows.length > 0;
}

// Adresse publique d'un site : <sous-domaine>.<domaine des sites>. En développement, accès de test par chemin (le Codespace ne gère pas les sous-domaines).
export function publishedSiteUrl(subdomain: string, appOrigin: string | null): string {
  if (devSitePathEnabled()) return `${appOrigin ?? ''}/_site/${subdomain}/`;
  const domain = publishedDomain();
  if (!domain) throw new Error('published_sites_domain_missing');
  return `https://${subdomain}.${domain}`;
}

// Origine canonique d'un site (sous-domaine), utilisée pour la balise canonique, le plan du site et robots.txt.
export function subdomainOrigin(subdomain: string, appOrigin: string | null): string {
  const domain = publishedDomain();
  if (domain) return `https://${subdomain}.${domain}`;
  if (isProductionEnvironment()) throw new Error('published_sites_domain_missing');
  return `${appOrigin ?? ''}/_site/${subdomain}`;
}

export async function activeCustomHostname(projectId: string): Promise<string | null> {
  const rows = await getDb().select({ hostname: customDomains.hostname, redirectTo: customDomains.redirectTo }).from(customDomains).where(and(eq(customDomains.projectId, projectId), eq(customDomains.status, 'verified'))).orderBy(customDomains.createdAt);
  return rows.find((row) => !row.redirectTo)?.hostname ?? null; // le domaine principal est celui qui n'est pas redirigé ailleurs
}
