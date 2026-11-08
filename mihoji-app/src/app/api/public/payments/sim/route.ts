import { confirmBooking, getBooking } from '@/lib/bookings/service';
import { confirmOrder, getOrder } from '@/lib/orders/service';
import { getPaymentsProvider } from '@/lib/payments';
import { SIM_SESSION_PREFIX } from '@/lib/payments/simulated';
import { escapeHtml, publicPage } from '@/lib/public-pages';
import { getRequestOrigin } from '@/lib/site-url';

// Page de paiement SIMULÉE (imite Stripe Checkout en développement sans clé Stripe) pour les rendez-vous et les commandes.
// Indisponible dès qu'une vraie clé est configurée.
type Pending = { kind: 'booking' | 'order'; id: string; dueCents: number };

async function pendingFor(request: Request, sessionId: string): Promise<{ origin: string; pending: Pending | null }> {
  const origin = getRequestOrigin(request);
  let simulated = false;
  try { simulated = getPaymentsProvider(origin).simulated; } catch { simulated = false; }
  const id = sessionId.startsWith(SIM_SESSION_PREFIX) ? sessionId.slice(SIM_SESSION_PREFIX.length) : '';
  if (!simulated || !/^[0-9a-f-]{36}$/i.test(id)) return { origin, pending: null };
  const booking = await getBooking(id);
  if (booking?.status === 'pending_payment') return { origin, pending: { kind: 'booking', id, dueCents: booking.dueCents } };
  const order = await getOrder(id);
  if (order?.status === 'pending_payment') return { origin, pending: { kind: 'order', id, dueCents: order.totalCents } };
  return { origin, pending: null };
}

const cancelLink = (pending: Pending) => `/api/public/bookings/done?${pending.kind === 'order' ? 'o' : 'b'}=${pending.id}&ok=0`;
const euros = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;
const form = (session: string, pending: Pending, error?: string) => `<p><strong>Paiement de test</strong> (simulation de Stripe) : ${escapeHtml(euros(pending.dueCents))}</p>${error ? `<p role="alert" style="color:#b00020">${escapeHtml(error)}</p>` : ''}<form method="post" action="/api/public/payments/sim?session=${escapeHtml(session)}"><label>Numéro de carte<br><input name="card" inputmode="numeric" autocomplete="off" style="font:inherit;padding:.5rem;width:100%" placeholder="4242 4242 4242 4242"></label><p><button type="submit" style="font:inherit;padding:.6rem 1rem">Payer</button></p><p style="color:#555;font-size:.9rem">Cartes de test : 4242 4242 4242 4242 (acceptée), 4000 0000 0000 0002 (refusée).</p></form><p><a href="${cancelLink(pending)}">Annuler</a></p>`;

export async function GET(request: Request) {
  const session = new URL(request.url).searchParams.get('session') ?? '';
  const { pending } = await pendingFor(request, session);
  if (!pending) return publicPage('Page introuvable', '<p>Cette page de paiement n’existe pas.</p>', 404);
  return publicPage('Paiement', form(session, pending));
}

export async function POST(request: Request) {
  const session = new URL(request.url).searchParams.get('session') ?? '';
  const { origin, pending } = await pendingFor(request, session);
  if (!pending) return publicPage('Page introuvable', '<p>Cette page de paiement n’existe pas.</p>', 404);
  const card = String((await request.formData().catch(() => null))?.get('card') ?? '').replace(/\s/g, '');
  if (card === '4242424242424242') {
    if (pending.kind === 'order') await confirmOrder(pending.id, `sim_pi_${pending.id}`, origin);
    else await confirmBooking(pending.id, `sim_pi_${pending.id}`, origin);
    return Response.redirect(`${origin}/api/public/bookings/done?${pending.kind === 'order' ? 'o' : 'b'}=${pending.id}&ok=1`, 303);
  }
  return publicPage('Paiement', form(session, pending, card === '4000000000000002' ? 'Votre carte a été refusée.' : 'Numéro de carte invalide.'));
}
