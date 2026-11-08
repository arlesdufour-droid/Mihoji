import type { MailMessage } from '@/lib/mailer/types';
import type { OrderLine } from './compute';

const euros = (cents: number) => `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })} €`;
const when = (pickupAt: Date) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' }).format(pickupAt);
type Info = { companyName: string; customerName: string; customerEmail: string; customerPhone: string; lines: OrderLine[]; totalCents: number; pickupAt: Date; paid: boolean; notes: string };
const detail = (lines: OrderLine[]) => lines.map((line) => `- ${line.quantity} × ${line.name} : ${euros(line.unitCents * line.quantity)}`);

export function orderCustomerEmail(info: Info): MailMessage {
  return { to: info.customerEmail, subject: `Commande confirmée — ${info.companyName}`.replace(/[\r\n]+/g, ' '), text: [
    `Bonjour ${info.customerName},`, '', `Votre commande chez ${info.companyName} est confirmée :`, ...detail(info.lines), `Total : ${euros(info.totalCents)} (${info.paid ? 'payé en ligne' : 'à régler au retrait'})`,
    '', `Retrait en boutique : ${when(info.pickupAt)}`, '', 'À bientôt !',
  ].join('\n') };
}

export function orderMerchantEmail(info: Info & { to: string; inboxUrl?: string }): MailMessage {
  return { to: info.to, subject: `Nouvelle commande — ${info.customerName}`.replace(/[\r\n]+/g, ' '), text: [
    'Bonjour,', '', `Nouvelle commande sur le site de ${info.companyName} :`, ...detail(info.lines), `Total : ${euros(info.totalCents)} (${info.paid ? 'payé en ligne, versé directement sur votre compte Stripe' : 'à encaisser au retrait'})`,
    `Retrait : ${when(info.pickupAt)}`, `Client : ${info.customerName} (${info.customerEmail}${info.customerPhone ? `, ${info.customerPhone}` : ''})`,
    ...(info.notes ? ['', `Remarque du client : ${info.notes}`] : []), ...(info.inboxUrl ? ['', `Toutes vos commandes : ${info.inboxUrl}`] : []),
  ].join('\n') };
}
