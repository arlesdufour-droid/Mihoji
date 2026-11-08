import type { MailMessage } from '@/lib/mailer/types';
import { EXTRA_LABELS } from './schema';

// Email envoyé au commerçant à chaque demande reçue (texte brut, jamais de HTML venant du visiteur).
export function leadNotificationEmail(input: { to: string; companyName: string; kind: 'quote' | 'contact'; name: string; email: string; phone: string; service: string; message: string; extra: Record<string, string>; inboxUrl?: string }): MailMessage {
  const what = input.kind === 'quote' ? 'demande de devis' : 'message';
  const lines = [
    `Bonjour,`,
    '',
    `Vous avez reçu une nouvelle ${what} par le site de ${input.companyName}.`,
    '',
    `Nom : ${input.name}`,
    `Email : ${input.email}`,
    ...(input.phone ? [`Téléphone : ${input.phone}`] : []),
    ...(input.service ? [`Prestation : ${input.service}`] : []),
    ...Object.entries(input.extra).map(([key, value]) => `${EXTRA_LABELS[key] ?? key} : ${value}`),
    '',
    'Message :',
    input.message,
    '',
    ...(input.inboxUrl ? [`Retrouvez toutes vos demandes : ${input.inboxUrl}`] : []),
    `Répondez directement à ${input.email}.`,
  ];
  return { to: input.to, subject: `Nouvelle ${what} — ${input.name}`.replace(/[\r\n]+/g, ' '), text: lines.join('\n') };
}
