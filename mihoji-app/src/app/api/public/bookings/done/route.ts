import { cancelPendingBooking, getBooking } from '@/lib/bookings/service';
import { escapeHtml, publicPage } from '@/lib/public-pages';

// Retour du paiement : confirmation ou annulation. L'état réel vient du webhook Stripe (ou de la page de paiement simulée), jamais de cette adresse.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('b') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return publicPage('Rendez-vous introuvable', '<p>Ce lien n’est plus valide.</p>', 404);
  if (url.searchParams.get('ok') === '0') {
    await cancelPendingBooking(id);
    return publicPage('Paiement annulé', '<p>Votre rendez-vous n’a pas été réservé. Vous pouvez recommencer depuis le site.</p>');
  }
  const booking = await getBooking(id);
  if (!booking) return publicPage('Rendez-vous introuvable', '<p>Ce lien n’est plus valide.</p>', 404);
  if (booking.status === 'confirmed') {
    const when = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' }).format(booking.startsAt);
    return publicPage('Rendez-vous confirmé', `<p>${escapeHtml(booking.service)} — ${escapeHtml(when)}.</p><p>Un email de confirmation vous a été envoyé.</p>`);
  }
  return publicPage('Paiement en cours de validation', '<p>Votre paiement est en cours de validation. Vous recevrez un email de confirmation dans quelques instants.</p>');
}
