import { bookingErrorMessages, bookingInputSchema } from '@/lib/bookings/schema';
import { createBooking } from '@/lib/bookings/service';
import { escapeHtml, publicPage } from '@/lib/public-pages';
import { consumeRateLimit } from '@/lib/rate-limit';
import { getRequestOrigin } from '@/lib/site-url';

// Prise de rendez-vous depuis un site (formulaire natif, sans JavaScript) : validation stricte, limites, puis paiement de l'acompte si nécessaire.
const failure = (message: string, status = 422) => publicPage('Rendez-vous non enregistré', `<p>${escapeHtml(message)}</p><p><a href="javascript:history.back()">Retour au site</a></p>`, status);

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return failure('Demande illisible.', 400);
  const parsed = bookingInputSchema.safeParse(Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === 'string')));
  if (!parsed.success) return failure('Vérifiez votre nom, votre email, la date et l’heure choisies, puis réessayez.');
  if (parsed.data.website) return publicPage('Merci !', '<p>Votre demande a bien été envoyée.</p>'); // robot : succès apparent, rien d'enregistré
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  if (!(await consumeRateLimit(`lead-book-ip:${ip}`, 10, 60 * 60 * 1000)) || !(await consumeRateLimit(`lead-book-site:${parsed.data.site}`, 80, 60 * 60 * 1000))) return failure('Trop de demandes pour le moment : réessayez plus tard ou appelez-nous.', 429);
  const origin = getRequestOrigin(request);
  const result = await createBooking(parsed.data, origin);
  if (!result.ok) return failure(bookingErrorMessages[result.error] ?? 'Le rendez-vous n’a pas pu être enregistré.', result.error === 'unknown_site' ? 404 : 422);
  return Response.redirect(result.redirect, 303);
}
