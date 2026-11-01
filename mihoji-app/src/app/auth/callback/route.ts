import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { applyIntent } from '@/lib/intent-server';
import { INTENT_COOKIE, parseIntent } from '@/lib/intent';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getPublicOrigin } from '@/lib/site-url';

export async function GET(request: NextRequest) {
  const origin = getPublicOrigin(request);
  if (!origin) return NextResponse.json({ error: 'public_origin_not_configured' }, { status: 500 });
  const redirect = (path: string) => NextResponse.redirect(new URL(path, origin));
  const code = request.nextUrl.searchParams.get('code');
  const errorCode = request.nextUrl.searchParams.get('error_code');
  if (errorCode) {
    console.error('Supabase authentication callback failed.', errorCode);
    return redirect(`/login?error=${encodeURIComponent(errorCode)}`);
  }
  if (!code) return redirect('/login?error=missing_code');

  const supabase = await getSupabaseServerClient();
  if (!supabase) return redirect('/login?error=supabase_not_configured');
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('Supabase code exchange failed.', error);
    return redirect(`/login?error=${encodeURIComponent(error.code ?? 'otp_expired')}`);
  }

  let destination = '/onboarding';
  try {
    const session = await getSession();
    const intent = parseIntent(request.cookies.get(INTENT_COOKIE)?.value);
    if (session && intent) destination = await applyIntent(session, intent);
  } catch (error) {
    console.error('Post-login account initialization failed.', error);
    return redirect('/login?error=account_initialization_failed');
  }
  const response = redirect(destination);
  response.cookies.delete(INTENT_COOKIE);
  return response;
}
