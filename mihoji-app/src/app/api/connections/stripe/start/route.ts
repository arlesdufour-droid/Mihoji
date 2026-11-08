import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { savePendingConnection, readSecret } from '@/lib/connectors/store';
import { getPaymentsProvider } from '@/lib/payments';
import { getRequestOrigin } from '@/lib/site-url';

// Brancher Stripe : crée (ou reprend) le compte connecté du commerçant, puis renvoie l'adresse de configuration chez Stripe.
// Le compte reste lié à l'espace côté serveur : l'adresse de retour ne contient aucun identifiant de compte.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.isDemo) return NextResponse.json({ error: 'database_required' }, { status: 422 });
  const origin = getRequestOrigin(request);
  try {
    const provider = getPaymentsProvider(origin);
    const accountId = (await readSecret(session.workspaceId, 'stripe')) ?? (await provider.createAccount()).accountId;
    await savePendingConnection(session.workspaceId, 'stripe', accountId);
    const returnUrl = `${origin}/api/connections/stripe/return`;
    return NextResponse.json({ url: await provider.onboardingUrl({ accountId, returnUrl, refreshUrl: returnUrl }) });
  } catch (error) {
    console.error('Stripe onboarding could not start.', error);
    return NextResponse.json({ error: 'unavailable' }, { status: 502 });
  }
}
