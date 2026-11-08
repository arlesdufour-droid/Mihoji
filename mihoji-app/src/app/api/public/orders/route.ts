import { createOrder, orderErrorMessages, orderInputSchema } from '@/lib/orders/service';
import { escapeHtml, publicPage } from '@/lib/public-pages';
import { consumeRateLimit } from '@/lib/rate-limit';
import { getRequestOrigin } from '@/lib/site-url';

// Commande click & collect depuis un site (formulaire natif, sans JavaScript) : les prix sont recalculés côté serveur depuis le site enregistré.
const failure = (message: string, status = 422) => publicPage('Commande non enregistrée', `<p>${escapeHtml(message)}</p><p><a href="javascript:history.back()">Retour au site</a></p>`, status);

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return failure('Demande illisible.', 400);
  const entries = [...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === 'string');
  const parsed = orderInputSchema.safeParse(Object.fromEntries(entries));
  if (!parsed.success) return failure('Vérifiez votre nom, votre email et la date de retrait, puis réessayez.');
  if (parsed.data.website) return publicPage('Merci !', '<p>Votre commande a bien été envoyée.</p>'); // robot : succès apparent, rien d'enregistré
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  if (!(await consumeRateLimit(`lead-order-ip:${ip}`, 10, 60 * 60 * 1000)) || !(await consumeRateLimit(`lead-order-site:${parsed.data.site}`, 80, 60 * 60 * 1000))) return failure('Trop de commandes pour le moment : réessayez plus tard ou appelez-nous.', 429);
  const result = await createOrder(parsed.data, entries, getRequestOrigin(request));
  if (!result.ok) return failure(orderErrorMessages[result.error] ?? 'La commande n’a pas pu être enregistrée.', result.error === 'unknown_site' ? 404 : 422);
  return Response.redirect(result.redirect, 303);
}
