import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const publicApiRoutes = new Set(['/api/health', '/api/auth/magic-link']);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPage = ['/studio', '/settings', '/onboarding'].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const protectedApi = pathname.startsWith('/api/') && !publicApiRoutes.has(pathname);
  if (!protectedPage && !protectedApi) return NextResponse.next();

  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (protectedApi) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', request.url));
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
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/studio/:path*', '/settings/:path*', '/onboarding/:path*', '/api/:path*'],
};
