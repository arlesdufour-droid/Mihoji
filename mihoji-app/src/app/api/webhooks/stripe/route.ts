import { cancelPendingBooking, confirmBooking } from '@/lib/bookings/service';
import { getPaymentsProvider } from '@/lib/payments';
import { getRequestOrigin } from '@/lib/site-url';

// Webhook Stripe : la signature est vérifiée sur le corps brut ; seul un paiement réellement encaissé confirme un rendez-vous.
export async function POST(request: Request) {
  const origin = getRequestOrigin(request);
  const body = await request.text();
  try {
    const event = await getPaymentsProvider(origin).parseWebhook(body, request.headers.get('stripe-signature'));
    if (event?.type === 'paid') await confirmBooking(event.bookingId, event.paymentIntentId, origin);
    else if (event?.type === 'expired') await cancelPendingBooking(event.bookingId);
    return Response.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook rejected.', error instanceof Error ? error.message : error);
    return Response.json({ error: 'invalid_signature' }, { status: 400 });
  }
}
