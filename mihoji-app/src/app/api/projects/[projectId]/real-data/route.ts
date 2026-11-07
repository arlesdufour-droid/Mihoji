import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { assertProjectAccess, getSession } from '@/lib/auth';
import { getDb } from '@/db/client';
import { companies } from '@/db/schema';
import { parseProfile } from '@/lib/site/facts';
import { applyHoursForm, applyStatsForm, currentForms, hoursFormSchema, hoursSummary, statsFormSchema } from '@/lib/site/real-data-forms';
import { loadProjectSite, saveProjectSite } from '@/lib/site/store';
import { z } from 'zod';

// Formulaires « Horaires » et « Chiffres clés » du Studio : lecture des valeurs actuelles et enregistrement d'une nouvelle version, sans IA ni crédit.
async function access(params: Promise<{ projectId: string }>) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) } as const;
  try { await assertProjectAccess(session, projectId); } catch { return { error: NextResponse.json({ error: 'project_not_found' }, { status: 404 }) } as const; }
  if (session.isDemo) return { error: NextResponse.json({ error: 'database_required' }, { status: 422 }) } as const;
  return { projectId, session } as const;
}

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const found = await access(params);
  if ('error' in found) return found.error;
  const site = await loadProjectSite(found.projectId);
  if (!site) return NextResponse.json({ error: 'structured_site_required' }, { status: 422 });
  return NextResponse.json(currentForms(site));
}

const bodySchema = z.object({ hours: hoursFormSchema.optional(), stats: statsFormSchema.optional() }).refine((value) => value.hours || value.stats);

export async function PUT(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const found = await access(params);
  if ('error' in found) return found.error;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  let site = await loadProjectSite(found.projectId);
  if (!site) return NextResponse.json({ error: 'structured_site_required' }, { status: 422 });
  const summaries: string[] = [];
  if (parsed.data.hours) { site = applyHoursForm(site, parsed.data.hours); summaries.push('Horaires mis à jour'); }
  if (parsed.data.stats) {
    const result = applyStatsForm(site, parsed.data.stats);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
    site = result.site;
    summaries.push('Chiffres clés mis à jour');
  }
  const db = getDb();
  await db.transaction(async (tx) => {
    await saveProjectSite(tx, { projectId: found.projectId, site: site!, summary: summaries.join(' · '), createdBy: 'user' });
    if (parsed.data.hours) {
      const [company] = await tx.select({ profile: companies.profile }).from(companies).where(eq(companies.workspaceId, found.session.workspaceId)).limit(1);
      if (company) {
        const profile = { ...parseProfile(company.profile), hours: hoursSummary(parsed.data.hours) || undefined };
        await tx.update(companies).set({ profile: Object.fromEntries(Object.entries(profile).filter(([, value]) => value)) }).where(eq(companies.workspaceId, found.session.workspaceId));
      }
    }
  });
  return NextResponse.json({ ok: true, ...currentForms(site) });
}
