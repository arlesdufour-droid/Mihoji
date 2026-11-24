import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertProjectAccess, getSession } from '@/lib/auth';
import { getPublicOrigin } from '@/lib/site-url';
import { getPublishedSite, publishedSiteUrl, renameSubdomain } from '@/lib/publish/store';
import { SUBDOMAIN_PROBLEM_LABELS } from '@/lib/publish/slug';

async function guard(projectId: string) {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  try { await assertProjectAccess(session, projectId); } catch { return { error: NextResponse.json({ error: 'project_not_found' }, { status: 404 }) }; }
  if (session.isDemo) return { error: NextResponse.json({ error: 'database_required' }, { status: 422 }) };
  return { session };
}

// Adresse du site publié : sous-domaine actuel, adresse complète et état (en ligne, dépublié, suspendu). published: false tant que le site n'a jamais été mis en ligne.
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const checked = await guard(projectId);
  if (checked.error) return checked.error;
  const site = await getPublishedSite(projectId);
  if (!site) return NextResponse.json({ published: false });
  const origin = getPublicOrigin(request) ?? new URL(request.url).origin;
  return NextResponse.json({ published: true, subdomain: site.subdomain, status: site.status, url: publishedSiteUrl(site.subdomain, origin), publishedAt: site.publishedAt });
}

// Modifier le sous-domaine : lettres, chiffres et tirets, jamais un mot réservé (www, app, admin, api…), unique.
export async function PUT(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const checked = await guard(projectId);
  if (checked.error) return checked.error;
  const parsed = z.object({ subdomain: z.string().trim().min(1).max(80) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const result = await renameSubdomain(projectId, parsed.data.subdomain);
  if (!result.ok) {
    const message = result.error === 'prise' ? 'Cette adresse est déjà prise : choisissez-en une autre.' : result.error === 'site_introuvable' ? 'Mettez d’abord votre site en ligne.' : SUBDOMAIN_PROBLEM_LABELS[result.error];
    return NextResponse.json({ error: result.error, message }, { status: result.error === 'prise' ? 409 : result.error === 'site_introuvable' ? 404 : 422 });
  }
  const origin = getPublicOrigin(request) ?? new URL(request.url).origin;
  return NextResponse.json({ subdomain: result.subdomain, url: publishedSiteUrl(result.subdomain, origin) });
}
