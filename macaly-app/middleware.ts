import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const protectedPrefixes = ['/studio', '/settings'];

export async function middleware(request: NextRequest) {
  const isProtected = protectedPrefixes.some((prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`));
  if (!isProtected || (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NODE_ENV !== 'production')) return NextResponse.next();

  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.redirect(new URL('/login', request.url));

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
  if (!data.user) return NextResponse.redirect(new URL('/login', request.url));
  return response;
}

export const config = {
  matcher: ['/studio/:path*', '/settings/:path*'],
};
