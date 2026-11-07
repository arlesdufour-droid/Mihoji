import { readUserPhoto } from '@/lib/site/user-photos-store';

// Image d'un utilisateur, servie sans connexion : les sites publiés y font référence. L'identifiant est un UUID non devinable.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = await readUserPhoto(id);
  if (!photo) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(photo.data), { headers: { 'Content-Type': photo.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*' } });
}
