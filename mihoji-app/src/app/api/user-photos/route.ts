import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { consumeRateLimit } from '@/lib/rate-limit';
import { deleteUserPhoto, listUserPhotos, saveUserPhoto } from '@/lib/site/user-photos-store';
import { photoKinds, userPhotoUrl, type PhotoKind } from '@/lib/site/user-photos';

// Photos de l'utilisateur (logo, boutique, réalisations) : liste, envoi, suppression. Réservé à l'espace connecté.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.isDemo) return NextResponse.json([]);
  const photos = await listUserPhotos(session.workspaceId);
  return NextResponse.json(photos.map((photo) => ({ id: photo.id, kind: photo.kind, alt: photo.alt, url: userPhotoUrl(photo.id) })));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.isDemo) return NextResponse.json({ error: 'database_required' }, { status: 422 });
  if (!(await consumeRateLimit(`user-photos:${session.workspaceId}`, 40, 60 * 60 * 1000))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const kind = String(form?.get('kind') ?? 'other') as PhotoKind;
  if (!(file instanceof File) || !photoKinds.includes(kind)) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const result = await saveUserPhoto({ workspaceId: session.workspaceId, kind, alt: String(form?.get('alt') ?? ''), bytes: Buffer.from(await file.arrayBuffer()), mime: file.type });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'too_large' ? 413 : result.error === 'too_many' ? 409 : 415 });
  return NextResponse.json({ id: result.photo.id, kind: result.photo.kind, alt: result.photo.alt, url: userPhotoUrl(result.photo.id) }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  if (!(await deleteUserPhoto(session.workspaceId, id))) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
