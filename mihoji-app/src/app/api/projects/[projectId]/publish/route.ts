import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { abuseReports, companies, fileBlobs, projectFiles, projectVersions, projects, publications } from '@/db/schema';
import { assertProjectAccess, getSession } from '@/lib/auth';
import { getPublishedSite, publishedSiteUrl, setPublishedStatus, upsertPublishedSite } from '@/lib/publish/store';
import { companyForSnapshot, renderSnapshotFiles, type PublishedSnapshot } from '@/lib/publish/snapshot';
import { complianceMissingLabels, complianceStatus } from '@/lib/compliance';
import { scanPublishedSite } from '@/lib/abuse/site-scan';
import { getPublicOrigin } from '@/lib/site-url';
import { parseStoredSite, SITE_FILE } from '@/lib/site/store';

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try { await assertProjectAccess(session, projectId); } catch { return NextResponse.json({ error: 'project_not_found' }, { status: 404 }); }
  if (session.isDemo) return NextResponse.json({ error: 'database_required' }, { status: 422 });
  const [project] = await getDb().select({ id: projects.id, name: projects.name, currentVersionId: projects.currentVersionId }).from(projects).where(and(eq(projects.id, projectId), eq(projects.workspaceId, session.workspaceId))).limit(1);
  if (!project?.currentVersionId) return NextResponse.json({ error: 'version_required' }, { status: 422 });
  const [company] = await getDb().select().from(companies).where(eq(companies.workspaceId, session.workspaceId)).limit(1);
  if (!company || !complianceStatus(company).complete) return NextResponse.json({ error: 'compliance_incomplete', missing: complianceMissingLabels(complianceStatus(company).missing) }, { status: 422 });
  const [version] = await getDb().select({ id: projectVersions.id, filesSnapshot: projectVersions.filesSnapshot }).from(projectVersions).where(eq(projectVersions.id, project.currentVersionId)).limit(1);
  if (!version) return NextResponse.json({ error: 'version_not_found' }, { status: 404 });
  const files = await getDb().select({ path: projectFiles.path, content: fileBlobs.content }).from(projectFiles).innerJoin(fileBlobs, eq(projectFiles.hash, fileBlobs.hash)).where(eq(projectFiles.projectId, projectId));
  // Copie figée de la version publiée : description structurée (nouveau format) ou fichiers HTML (anciens projets) + coordonnées de l'entreprise.
  // Le site est ensuite servi par l'application elle-même selon le nom d'hôte (pas de déploiement par site).
  const site = parseStoredSite(files.find((file) => file.path === SITE_FILE)?.content);
  const snapshot: PublishedSnapshot = {
    v: 1, projectId, assetOrigin: getPublicOrigin(request), company: companyForSnapshot(company),
    site, files: site ? null : Object.fromEntries(files.filter((file) => file.path !== SITE_FILE).map((file) => [file.path, file.content])),
  };
  const siteFiles = renderSnapshotFiles(snapshot);
  const findings = scanPublishedSite(siteFiles);
  if (findings.length > 0) {
    const [publication] = await getDb().insert(publications).values({ projectId, versionId: version.id, url: 'blocked', status: 'failed' }).returning({ id: publications.id });
    if (publication) await getDb().insert(abuseReports).values(findings.map((reason) => ({ publicationId: publication.id, reason })));
    return NextResponse.json({ error: 'site_blocked', reasons: findings }, { status: 422 });
  }
  const current = await getPublishedSite(projectId);
  if (current?.status === 'blocked') return NextResponse.json({ error: 'site_suspended' }, { status: 422 });
  try {
    const { subdomain } = await upsertPublishedSite({ projectId, versionId: version.id, companyName: company.name || project.name, snapshot });
    const url = publishedSiteUrl(subdomain, getPublicOrigin(request) ?? new URL(request.url).origin);
    // Les anciennes publications du projet restent dans l'historique ; seule la dernière compte comme « en ligne ».
    await getDb().update(publications).set({ status: 'suspended' }).where(and(eq(publications.projectId, projectId), eq(publications.status, 'published')));
    await getDb().insert(publications).values({ projectId, versionId: version.id, url, status: 'published' });
    return NextResponse.json({ url, subdomain });
  } catch (error) {
    console.error('Publication failed', error);
    return NextResponse.json({ error: 'publication_failed' }, { status: 502 });
  }
}

// Dépublier : le site répond « site indisponible » immédiatement (cache invalidé) ; on peut le remettre en ligne ensuite.
export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try { await assertProjectAccess(session, projectId); } catch { return NextResponse.json({ error: 'project_not_found' }, { status: 404 }); }
  if (session.isDemo) return NextResponse.json({ error: 'database_required' }, { status: 422 });
  const current = await getPublishedSite(projectId);
  if (!current) return NextResponse.json({ error: 'not_published' }, { status: 404 });
  if (current.status === 'blocked') return NextResponse.json({ error: 'site_suspended' }, { status: 422 });
  await setPublishedStatus(projectId, 'unpublished');
  await getDb().update(publications).set({ status: 'suspended' }).where(and(eq(publications.projectId, projectId), eq(publications.status, 'published')));
  return NextResponse.json({ ok: true });
}
