import { getSession } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { readVitrineEntry, renderVitrineHtml } from '@/lib/vitrine/store';

// Aperçu d'un site d'exemple de la vitrine (administrateurs seulement), rendu par le moteur actuel des sites avec la mention « entreprise fictive ».
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return new Response('forbidden', { status: 403 });
  const { slug } = await params;
  const entry = readVitrineEntry(slug);
  if (!entry) return new Response('not_found', { status: 404 });
  return new Response(renderVitrineHtml(entry), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Content-Security-Policy': "script-src 'none'; form-action 'none'" } });
}
