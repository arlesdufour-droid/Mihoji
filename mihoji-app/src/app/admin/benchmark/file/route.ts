import { getSession } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { readRunFile } from '@/lib/site/benchmark-store';

// Captures et pages du banc d'essai (administrateurs seulement ; jamais servies comme fichiers publics).
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return new Response('forbidden', { status: 403 });
  const params = new URL(request.url).searchParams;
  const name = params.get('name') ?? '';
  const content = readRunFile(params.get('run') ?? '', name);
  if (!content) return new Response('not_found', { status: 404 });
  const html = name.endsWith('.html');
  return new Response(new Uint8Array(content), { headers: { 'Content-Type': html ? 'text/html; charset=utf-8' : 'image/jpeg', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...(html ? { 'Content-Security-Policy': "sandbox allow-same-origin" } : {}) } });
}
