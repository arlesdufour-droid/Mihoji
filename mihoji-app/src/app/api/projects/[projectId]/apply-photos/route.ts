import { NextResponse } from 'next/server';
import { assertProjectAccess, getSession } from '@/lib/auth';
import { getDb } from '@/db/client';
import { applyPhotoRules } from '@/lib/photos/rules';
import { loadProjectSite, saveProjectSite } from '@/lib/site/store';
import { applyUserPhotos, dropMissingUserPhotos } from '@/lib/site/user-photos';
import { listUserPhotos } from '@/lib/site/user-photos-store';

// « Utiliser mes photos dans le site » : répartit logo, boutique et réalisations dans les emplacements du site (sans IA, sans crédit)
// et enregistre le résultat comme une nouvelle version, l'historique restant intact.
export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try { await assertProjectAccess(session, projectId); } catch { return NextResponse.json({ error: 'project_not_found' }, { status: 404 }); }
  if (session.isDemo) return NextResponse.json({ error: 'database_required' }, { status: 422 });
  const site = await loadProjectSite(projectId);
  if (!site) return NextResponse.json({ error: 'structured_site_required' }, { status: 422 });
  const photos = await listUserPhotos(session.workspaceId);
  const cleaned = dropMissingUserPhotos(site, new Set(photos.map((photo) => photo.id)));
  const { site: applied, report } = applyUserPhotos(cleaned, photos);
  const { site: ruled } = applyPhotoRules(applied);
  await getDb().transaction((tx) => saveProjectSite(tx, { projectId, site: ruled, summary: 'Photos de l’entreprise ajoutées', createdBy: 'user' }));
  return NextResponse.json({ ok: true, ...report });
}
