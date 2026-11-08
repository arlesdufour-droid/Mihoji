import { cancelPendingBooking, confirmBooking, getBooking } from '@/lib/bookings/service';
import { getPaymentsProvider } from '@/lib/payments';
import { SIM_SESSION_PREFIX } from '@/lib/payments/simulated';
import { escapeHtml, publicPage } from '@/lib/public-pages';
import { getRequestOrigin } from '@/lib/site-url';

// Page de paiement SIMULÉE (imite Stripe Checkout en développement sans clé Stripe). Indisponible dès qu'une vraie clé est configurée.
async function context(request: Request, sessionId: string) {
  const origin = getRequestOrigin(request);
  let simulated = false;
  try { simulated = getPaymentsProvider(origin).simulated; } catch { simulated = false; }
  const id = sessionId.startsWith(SIM_SESSION_PREFIX) ? sessionId.slice(SIM_SESSION_PREFIX.length) : '';
  const booking = simulated && /^[0-9a-f-]{36}$/i.test(id) ? await getBooking(id) : null;
  return { origin, booking, id };
}

const form = (session: string, amount: string, error?: string) => `<p><strong>Paiement de test</strong> (simulation de Stripe) : ${escapeHtml(amount)}</p>${error ? `<p role="alert" style="color:#b00020">${escapeHtml(error)}</p>` : ''}<form method="post" action="/api/public/payments/sim?session=${escapeHtml(session)}"><label>Numéro de carte<br><input name="card" inputmode="numeric" autocomplete="off" style="font:inherit;padding:.5rem;width:100%" placeholder="4242 4242 4242 4242"></label><p><button type="submit" style="font:inherit;padding:.6rem 1rem">Payer</button></p><p style="color:#555;font-size:.9rem">Cartes de test : 4242 4242 4242 4242 (acceptée), 4000 0000 0000 0002 (refusée).</p></form><p><a href="/api/public/bookings/done?b=%ID%&ok=0">Annuler</a></p>`;

export async function GET(request: Request) {
  const session = new URL(request.url).searchParams.get('session') ?? '';
  const { booking, id } = await context(request, session);
  if (!booking || booking.status !== 'pending_payment') return publicPage('Page introuvable', '<p>Cette page de paiement n’existe pas.</p>', 404);
  return publicPage('Paiement', form(session, `${(booking.dueCents / 100).toFixed(2).replace('.', ',')} €`).replace('%ID%', id));
}

export async function POST(request: Request) {
  const session = new URL(request.url).searchParams.get('session') ?? '';
  const { origin, booking, id } = await context(request, session);
  if (!booking || booking.status !== 'pending_payment') return publicPage('Page introuvable', '<p>Cette page de paiement n’existe pas.</p>', 404);
  const card = String((await request.formData().catch(() => null))?.get('card') ?? '').replace(/\s/g, '');
  const amount = `${(booking.dueCents / 100).toFixed(2).replace('.', ',')} €`;
  if (card === '4242424242424242') {
    await confirmBooking(id, `sim_pi_${id}`, origin);
    return Response.redirect(`${origin}/api/public/bookings/done?b=${id}&ok=1`, 303);
  }
  if (card === '4000000000000002') return publicPage('Paiement', form(session, amount, 'Votre carte a été refusée.').replace('%ID%', id));
  void cancelPendingBooking;
  return publicPage('Paiement', form(session, amount, 'Numéro de carte invalide.').replace('%ID%', id));
}
