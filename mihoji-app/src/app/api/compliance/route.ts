import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { companies, fileBlobs, projectFiles, projectVersions, projects } from '@/db/schema';
import { assertProjectAccess, getSession } from '@/lib/auth';
import { complianceStatus, generateComplianceDocuments } from '@/lib/compliance';
import { hashContent } from '@/lib/engine/operations';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const [company] = await getDb().select().from(companies).where(eq(companies.workspaceId, session.workspaceId)).limit(1);
  return NextResponse.json({ status: complianceStatus(company ?? null) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as { projectId?: string } | null;
  if (!body?.projectId) return NextResponse.json({ error: 'project_required' }, { status: 400 });
  try { await assertProjectAccess(session, body.projectId); } catch { return NextResponse.json({ error: 'project_not_found' }, { status: 404 }); }
  const [company] = await getDb().select().from(companies).where(eq(companies.workspaceId, session.workspaceId)).limit(1);
  if (!company) return NextResponse.json({ error: 'company_required' }, { status: 400 });
  try {
    const companyData = { name: company.name, legalForm: company.legalForm, siren: company.siren, address: company.address, activity: company.activity, missingFields: company.missingFields && typeof company.missingFields === 'object' ? company.missingFields : {} };
    const documents = generateComplianceDocuments(companyData);
    const db = getDb();
    await db.transaction(async (tx) => {
      const [project] = await tx.select({ currentVersionId: projects.currentVersionId }).from(projects).where(eq(projects.id, body.projectId!)).limit(1);
      const snapshot: Record<string, string> = {};
      for (const [path, content] of Object.entries(documents)) {
        const hash = hashContent(content);
        snapshot[path] = hash;
        await tx.insert(fileBlobs).values({ hash, content }).onConflictDoNothing();
        await tx.insert(projectFiles).values({ projectId: body.projectId!, path, hash }).onConflictDoUpdate({ target: [projectFiles.projectId, projectFiles.path], set: { hash, updatedAt: new Date() } });
      }
      const [version] = await tx.insert(projectVersions).values({ projectId: body.projectId!, parentVersionId: project?.currentVersionId ?? null, createdBy: 'agent', summary: 'Génération des documents de conformité', filesSnapshot: snapshot, status: 'built' }).returning({ id: projectVersions.id });
      if (version) await tx.update(projects).set({ currentVersionId: version.id }).where(eq(projects.id, body.projectId!));
    });
    return NextResponse.json({ documents });
  } catch (error) {
    if (error instanceof Error && error.message === 'compliance_incomplete') return NextResponse.json({ error: 'compliance_incomplete' }, { status: 422 });
    throw error;
  }
}
