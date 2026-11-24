import { devSitePathEnabled, ROUTED_HEADER } from '@/lib/publish/config';
import { notFoundPageHtml, unavailablePageHtml } from '@/lib/publish/pages';
import { loadServedSite } from '@/lib/publish/serve';
import { contentTypeOf, resolveFile, siteSecurityHeaders } from '@/lib/publish/snapshot';

// Route interne qui sert les sites publiés. Le proxy y réécrit les requêtes dont le nom d'hôte est <sous-domaine>.<PUBLISHED_SITES_DOMAIN> ou un domaine personnalisé vérifié
// (en-tête x-mihoji-routed, que le proxy efface sur toute requête entrante). En développement seulement, /_site/<sous-domaine>/ sert aussi de chemin d'accès de test.

const html = (body: string, status: number, extra: Record<string, string> = {}) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex', 'X-Content-Type-Options': 'nosniff', ...extra } });

export async function GET(request: Request, { params }: { params: Promise<{ key: string; path?: string[] }> }) {
  const { key: rawKey, path = [] } = await params;
  const routed = request.headers.get(ROUTED_HEADER) === '1';
  if (!routed && !devSitePathEnabled()) return html(notFoundPageHtml(), 404, { 'Cache-Control': 'no-store' });
  const key = decodeURIComponent(rawKey).toLowerCase();
  const url = new URL(request.url);
  const devOrigin = devSitePathEnabled() ? url.origin : null;
  const site = await loadServedSite(key, devOrigin);

  if (site.state === 'redirect') return Response.redirect(`https://${site.to}/${path.join('/')}${url.search}`, 308);
  if (site.state === 'unavailable') return html(unavailablePageHtml(), 503, { 'Cache-Control': 'no-store', 'Retry-After': '3600' });
  if (site.state === 'unknown') return html(notFoundPageHtml(), 404, { 'Cache-Control': 'public, max-age=0, s-maxage=30' });

  const file = resolveFile(site.files, path);
  if (!file) return html(notFoundPageHtml(), 404, { 'Cache-Control': 'public, max-age=0, s-maxage=30', ...siteSecurityHeaders(site.assetOrigin) });
  // Accès de test par chemin (Next retire la barre finale) : une balise <base> fait résoudre la feuille de style et les liens relatifs sous /_site/<sous-domaine>/.
  const content = !routed && file.endsWith('.html') ? site.files[file].replace('<head>', `<head><base href="/_site/${encodeURIComponent(key)}/">`) : site.files[file];
  return new Response(content, {
    headers: {
      'Content-Type': contentTypeOf(file),
      // Pages déjà rendues et en cache côté application ; le CDN les garde peu de temps (une publication est visible en moins d'une minute).
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
      ...siteSecurityHeaders(site.assetOrigin),
    },
  });
}
