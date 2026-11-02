import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCreditBalance } from '@/lib/billing/queries';
import { debitCredits } from '@/lib/billing/mutations';
import { tokensToCredits } from '@/lib/ai/pricing';
import { LlmProviderError } from '@/lib/ai/providers/types';
import { consumeRateLimit } from '@/lib/rate-limit';
import { onboardingSiteSchema } from '@/lib/site/onboarding-request';
import { createOnboardingSite } from '@/lib/site/onboarding-service';

// Une création complète par le modèle de design peut prendre une à deux minutes.
export const maxDuration = 300;

// Dernière étape de l'onboarding : crée le site à partir de la demande de l'utilisateur et des données de son entreprise.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = onboardingSiteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  // Session de démonstration : pas d'espace réel, le Studio de démonstration est utilisé.
  if (session.isDemo) return NextResponse.json({ id: 'demo' });
  const balance = await getCreditBalance(session.workspaceId);
  if (balance.remaining < 1) return NextResponse.json({ error: 'insufficient_credits' }, { status: 402 });
  if (!(await consumeRateLimit(`onboarding-site:${session.workspaceId}`, 6, 60 * 60 * 1000))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  try {
    const result = await createOnboardingSite({ workspaceId: session.workspaceId, userId: session.user.id, request: parsed.data.request, style: parsed.data.style, signal: request.signal });
    if (result.status === 'no_company') return NextResponse.json({ error: 'company_required' }, { status: 400 });
    if (result.status === 'failed') {
      console.warn('Onboarding site creation failed.', result.error);
      return NextResponse.json({ error: 'generation_failed' }, { status: 502 });
    }
    if (!result.mock && result.tokens > 0) await debitCredits(session.workspaceId, Math.min(tokensToCredits(result.tokens), balance.remaining), 'site_creation');
    return NextResponse.json({ id: result.projectId });
  } catch (error) {
    if (error instanceof LlmProviderError && error.code === 'ai_not_configured') return NextResponse.json({ error: 'ai_not_configured' }, { status: 503 });
    throw error;
  }
}
