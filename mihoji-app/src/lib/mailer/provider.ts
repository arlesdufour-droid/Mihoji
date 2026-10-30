import type { Mailer, MailMessage } from './types';

class MockMailer implements Mailer {
  async send(message: MailMessage) {
    console.info('Transactional email simulated', { to: message.to, subject: message.subject });
  }
}

class BrevoMailer implements Mailer {
  async send(message: MailMessage) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.MAILER_FROM_EMAIL;
    if (!apiKey || !senderEmail) throw new Error('mailer_not_configured');
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ sender: { email: senderEmail, name: process.env.MAILER_FROM_NAME ?? 'Mihoji' }, to: [{ email: message.to }], subject: message.subject, textContent: message.text }),
    });
    if (!response.ok) throw new Error('mailer_send_failed');
  }
}

export function getMailer(): Mailer {
  return process.env.BREVO_API_KEY ? new BrevoMailer() : new MockMailer();
}

export const transactionalEmails = {
  welcome: (name: string): MailMessage => ({ to: '', subject: 'Bienvenue sur Mihoji', text: `Bonjour ${name},\n\nVotre espace Mihoji est prêt. Vous pouvez commencer à créer votre site.` }),
  published: (url: string): MailMessage => ({ to: '', subject: 'Votre site est en ligne', text: `Votre site est maintenant en ligne : ${url}` }),
  creditsLow: (remaining: number): MailMessage => ({ to: '', subject: 'Vos crédits Mihoji bientôt épuisés', text: `Il vous reste ${remaining.toLocaleString('fr-FR')} crédits. Pensez à renouveler votre formule.` }),
};
