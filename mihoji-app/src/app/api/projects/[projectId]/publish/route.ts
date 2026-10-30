import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { abuseReports, companies, fileBlobs, projectFiles, projectVersions, projects, publications } from '@/db/schema';
import { assertProjectAccess, getSession } from '@/lib/auth';
import { getPublishProvider } from '@/lib/publish/provider';
import { complianceStatus } from '@/lib/compliance';
import { scanPublishedSite } from '@/lib/abuse/site-scan';

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try { await assertProjectAccess(session, projectId); } catch { return NextResponse.json({ error: 'project_not_found' }, { status: 404 }); }
  if (session.isDemo) return NextResponse.json({ error: 'database_required' }, { status: 422 });
  const [project] = await getDb().select({ id: projects.id, name: projects.name, currentVersionId: projects.currentVersionId }).from(projects).where(and(eq(projects.id, projectId), eq(projects.workspaceId, session.workspaceId))).limit(1);
  if (!project?.currentVersionId) return NextResponse.json({ error: 'version_required' }, { status: 422 });
  const [company] = await getDb().select().from(companies).where(eq(companies.workspaceId, session.workspaceId)).limit(1);
  if (!company || !complianceStatus(company).complete) return NextResponse.json({ error: 'compliance_incomplete', missing: complianceStatus(company).missing }, { status: 422 });
  const [version] = await getDb().select({ id: projectVersions.id, filesSnapshot: projectVersions.filesSnapshot }).from(projectVersions).where(eq(projectVersions.id, project.currentVersionId)).limit(1);
  if (!version) return NextResponse.json({ error: 'version_not_found' }, { status: 404 });
  const files = await getDb().select({ path: projectFiles.path, content: fileBlobs.content }).from(projectFiles).innerJoin(fileBlobs, eq(projectFiles.hash, fileBlobs.hash)).where(eq(projectFiles.projectId, projectId));
  const siteFiles = Object.fromEntries(files.map((file) => [file.path, file.content]));
  const findings = scanPublishedSite(siteFiles);
  if (findings.length > 0) {
    const [publication] = await getDb().insert(publications).values({ projectId, versionId: version.id, url: 'blocked', status: 'failed' }).returning({ id: publications.id });
    if (publication) await getDb().insert(abuseReports).values(findings.map((reason) => ({ publicationId: publication.id, reason })));
    return NextResponse.json({ error: 'site_blocked', reasons: findings }, { status: 422 });
  }
  const provider = getPublishProvider();
  try {
    const result = await provider.publish({ projectId, versionId: version.id, siteName: project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mihoji', files: siteFiles });
    await getDb().insert(publications).values({ projectId, versionId: version.id, url: result.url, status: 'published' });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Publication failed', error);
    return NextResponse.json({ error: 'publication_failed' }, { status: 502 });
  }
}
