import type { MailMessage } from '@/lib/mailer/types';

const euros = (cents: number) => `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })} €`;
const when = (startsAt: Date) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' }).format(startsAt);

type Info = { companyName: string; service: string; startsAt: Date; customerName: string; customerEmail: string; customerPhone: string; paidCents: number; totalCents: number; notes: string };

// Email au client : confirmation du rendez-vous (texte brut).
export function bookingCustomerEmail(info: Info): MailMessage {
  return { to: info.customerEmail, subject: `Rendez-vous confirmé — ${info.companyName}`.replace(/[\r\n]+/g, ' '), text: [
    `Bonjour ${info.customerName},`, '', `Votre rendez-vous chez ${info.companyName} est confirmé :`, `- Prestation : ${info.service}`, `- Date : ${when(info.startsAt)}`,
    ...(info.paidCents > 0 ? [`- Acompte payé : ${euros(info.paidCents)}${info.totalCents > info.paidCents ? ` (reste ${euros(info.totalCents - info.paidCents)} à régler sur place)` : ''}`] : []),
    '', 'À bientôt !',
  ].join('\n') };
}

// Email au commerçant : nouveau rendez-vous.
export function bookingMerchantEmail(info: Info & { to: string; inboxUrl?: string }): MailMessage {
  return { to: info.to, subject: `Nouveau rendez-vous — ${info.customerName}`.replace(/[\r\n]+/g, ' '), text: [
    'Bonjour,', '', `Nouveau rendez-vous pris sur le site de ${info.companyName} :`, `- Prestation : ${info.service}`, `- Date : ${when(info.startsAt)}`,
    `- Client : ${info.customerName} (${info.customerEmail}${info.customerPhone ? `, ${info.customerPhone}` : ''})`,
    ...(info.paidCents > 0 ? [`- Acompte payé : ${euros(info.paidCents)} (versé directement sur votre compte Stripe)`] : []),
    ...(info.notes ? ['', `Remarque du client : ${info.notes}`] : []),
    ...(info.inboxUrl ? ['', `Tous vos rendez-vous : ${info.inboxUrl}`] : []),
  ].join('\n') };
}
