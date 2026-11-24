import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getRequestOrigin } from '@/lib/site-url';
import { devSitePathEnabled, ROUTED_HEADER } from '@/lib/publish/config';
import { isSharedAssetPath, resolveHost, siteKeyOf } from '@/lib/publish/hosts';
import { notFoundPageHtml } from '@/lib/publish/pages';

const publicApiRoutes = new Set(['/api/health', '/api/auth/magic-link', '/api/public/leads', '/api/webhooks/stripe']);

function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL('/login', getRequestOrigin(request)));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (request.headers.get('x-forwarded-proto') === 'http' && process.env.APP_ENV === 'production') {
    const secureUrl = request.nextUrl.clone();
    secureUrl.protocol = 'https:';
    return NextResponse.redirect(secureUrl, 308);
  }
  // Publication multi-tenant : une seule application sert tous les sites publiés, selon le nom d'hôte de la requête.
  // L'en-tête interne est effacé sur toute requête entrante : seul ce proxy peut l'ajouter.
  const forwarded = new Headers(request.headers);
  forwarded.delete(ROUTED_HEADER);
  const target = resolveHost(request.headers.get('x-forwarded-host') ?? request.headers.get('host'));
  if (target.kind === 'invalid') return new NextResponse(notFoundPageHtml(), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
  if (target.kind !== 'app') {
    // Sur le nom d'hôte d'un site : formulaires, photos et polices restent servis par l'application ; tout le reste est le site (jamais le Studio ni l'API privée).
    if (isSharedAssetPath(pathname, request.method)) return NextResponse.next({ request: { headers: forwarded } });
    // Next réexécute le proxy sur l'adresse réécrite : une requête déjà routée vers ce site passe telle quelle (sinon la réécriture se répéterait).
    const siteKey = siteKeyOf(target);
    if (request.headers.get(ROUTED_HEADER) === '1' && (pathname === `/_site/${siteKey}` || pathname.startsWith(`/_site/${siteKey}/`))) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = `/_site/${siteKey}${pathname === '/' ? '' : pathname}`;
    forwarded.set(ROUTED_HEADER, '1');
    return NextResponse.rewrite(url, { request: { headers: forwarded } });
  }
  // Chemin interne /_site : accès de test réservé au développement.
  if (pathname === '/_site' || pathname.startsWith('/_site/')) {
    return devSitePathEnabled() ? NextResponse.next({ request: { headers: forwarded } }) : new NextResponse(notFoundPageHtml(), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
  }
  const protectedPage = ['/studio', '/settings', '/onboarding', '/agency'].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  // Les photos des utilisateurs sont lues par les sites publiés : lecture publique (identifiant non devinable), jamais l'écriture.
  const publicPhoto = request.method === 'GET' && /^\/api\/(site-photos|hosted-photos)\/[0-9a-f-]{36}$/i.test(pathname);
  const protectedApi = pathname.startsWith('/api/') && !publicApiRoutes.has(pathname) && !pathname.startsWith('/api/public/') && !publicPhoto;
  if (!protectedPage && !protectedApi) return NextResponse.next();

  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (protectedApi) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    return redirectToLogin(request);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  console.info('Mihoji proxy authenticated request', pathname, Boolean(data.user));
  if (!data.user) {
    if (protectedApi) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    return redirectToLogin(request);
  }
  return response;
}

export const config = {
  // Toutes les pages (le nom d'hôte décide), sauf les fichiers statiques de Next.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
