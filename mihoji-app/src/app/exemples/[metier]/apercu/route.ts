import { keptEntryBySlug, renderVitrineHtml } from '@/lib/vitrine/store';

// Site d'exemple de la vitrine, rendu par le moteur actuel des sites (description structurée enregistrée dans le dépôt : ni IA ni base). Mention « entreprise fictive » visible.
export async function GET(_request: Request, { params }: { params: Promise<{ metier: string }> }) {
  const { metier } = await params;
  const entry = keptEntryBySlug(metier);
  if (!entry) return new Response('Exemple introuvable', { status: 404 });
  return new Response(renderVitrineHtml(entry), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'Content-Security-Policy': "script-src 'none'; frame-ancestors 'self'" } });
}
