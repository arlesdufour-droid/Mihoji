import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const errorCode = request.nextUrl.searchParams.get('error_code');
  if (errorCode) {
    console.error('Supabase authentication callback failed.', errorCode);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorCode)}`, request.url));
  }
  if (!code) return NextResponse.redirect(new URL('/login?error=missing_code', request.url));

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(new URL('/login?error=supabase_not_configured', request.url));
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('Supabase code exchange failed.', error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.code ?? 'otp_expired')}`, request.url));
  }

  try {
    await getSession();
  } catch (error) {
    console.error('Post-login account initialization failed.', error);
    return NextResponse.redirect(new URL('/login?error=account_initialization_failed', request.url));
  }
  return NextResponse.redirect(new URL('/onboarding', request.url));
}
