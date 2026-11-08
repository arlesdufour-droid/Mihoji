import { cancelPendingBooking, confirmBooking } from '@/lib/bookings/service';
import { cancelPendingOrder, confirmOrder } from '@/lib/orders/service';
import { getPaymentsProvider } from '@/lib/payments';
import { getRequestOrigin } from '@/lib/site-url';

// Webhook Stripe : la signature est vérifiée sur le corps brut ; seul un paiement réellement encaissé confirme un rendez-vous.
export async function POST(request: Request) {
  const origin = getRequestOrigin(request);
  const body = await request.text();
  try {
    const event = await getPaymentsProvider(origin).parseWebhook(body, request.headers.get('stripe-signature'));
    // L'identifiant désigne un rendez-vous ou une commande (UUID uniques) : la mise à jour ne touche que celui qui existe.
    if (event?.type === 'paid') { if (!(await confirmBooking(event.bookingId, event.paymentIntentId, origin))) await confirmOrder(event.bookingId, event.paymentIntentId, origin); }
    else if (event?.type === 'expired') { await cancelPendingBooking(event.bookingId); await cancelPendingOrder(event.bookingId); }
    return Response.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook rejected.', error instanceof Error ? error.message : error);
    return Response.json({ error: 'invalid_signature' }, { status: 400 });
  }
}
