import { NextResponse } from 'next/server';
import { getLatestProjectPath, getSession } from '@/lib/auth';
import { connectors } from '@/lib/connectors/registry';
import { readSecret, saveConnection } from '@/lib/connectors/store';
import { getPaymentsProvider } from '@/lib/payments';
import { getRequestOrigin } from '@/lib/site-url';

// Retour de la configuration Stripe : on vérifie auprès de Stripe que le compte lié à cet espace peut encaisser, puis on l'active.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL('/login', request.url));
  const origin = getRequestOrigin(request);
  const latest = await getLatestProjectPath(session);
  const back = (state: string) => NextResponse.redirect(new URL(latest ? `${latest.replace(/\/[^/]*$/, '')}/connections?stripe=${state}` : '/studio', origin));
  try {
    const accountId = await readSecret(session.workspaceId, 'stripe');
    if (!accountId) return back('missing');
    const status = await getPaymentsProvider(origin).accountStatus(accountId);
    if (!status.ready) return back('incomplete');
    await saveConnection({ workspaceId: session.workspaceId, provider: 'stripe', secret: accountId, accountLabel: status.label, scopes: connectors.find((connector) => connector.id === 'stripe')!.capabilities });
    return back('connected');
  } catch (error) {
    console.error('Stripe onboarding return failed.', error);
    return back('error');
  }
}
