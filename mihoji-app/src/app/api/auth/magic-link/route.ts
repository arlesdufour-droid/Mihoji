import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/site-url';
import { consumeRateLimit } from '@/lib/rate-limit';

const requestSchema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  if (!(await consumeRateLimit(`magic-link:${ip}`, 5, 60 * 60_000))) return NextResponse.json({ error: 'ip_rate_limited' }, { status: 429 });

  const siteUrl = getSiteUrl(request);
  if (!siteUrl) {
    console.error('Magic link URL unavailable: configure NEXT_PUBLIC_SITE_URL or forwarded host headers.');
    return NextResponse.json({ error: 'site_url_not_configured' }, { status: 500 });
  }
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 503 });

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });
  if (error) {
    console.error('Magic link request failed.', error);
    if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
      return NextResponse.json({ error: 'email_rate_limit' }, { status: 429 });
    }
    return NextResponse.json({ error: 'magic_link_failed' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
