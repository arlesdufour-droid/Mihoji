import { z } from 'zod';

// Réservation envoyée par le formulaire d'un site : validée strictement côté serveur.
const clean = (max: number) => z.string().trim().max(max);

export const bookingInputSchema = z.object({
  site: z.string().uuid(),
  service: clean(60).min(1),
  date: clean(10).regex(/^\d{4}-\d{2}-\d{2}$/),
  time: clean(5).regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  nom: clean(120).min(1),
  email: clean(200).email(),
  telephone: clean(40).regex(/^[\d\s+().-]*$/).default(''),
  notes: clean(1000).default(''),
  website: clean(200).default(''),
});
export type BookingInput = z.infer<typeof bookingInputSchema>;

export const bookingErrorMessages: Record<string, string> = {
  closed: 'Ce créneau est en dehors des horaires de rendez-vous. Choisissez un autre jour ou une autre heure.',
  too_soon: 'Ce créneau est trop proche : choisissez un rendez-vous un peu plus tard.',
  taken: 'Ce créneau vient d’être réservé. Choisissez-en un autre.',
  unknown_service: 'Cette prestation n’existe pas.',
  invalid: 'Vérifiez la date et l’heure choisies.',
  no_booking: 'La prise de rendez-vous n’est pas activée sur ce site.',
  payment_unavailable: 'Le paiement en ligne n’est pas encore disponible pour ce site. Appelez-nous pour réserver.',
  unknown_site: 'Ce site n’existe plus.',
  payment_error: 'Le paiement n’a pas pu démarrer. Réessayez dans quelques minutes.',
};
