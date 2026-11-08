import { describe, expect, it } from 'vitest';
import { absolutizeLeadActions, injectSiteId, leadFormOpen } from '../site/lead-form';
import { renderSite } from '../site/render';
import { samples } from '../site/samples';
import { siteSchema } from '../site/schema';
import { leadNotificationEmail } from './email';
import { leadExtra, leadSchema } from './schema';

const valid = { site: '0aea97ac-e5f3-4136-b0c4-de3aeb0081ab', kind: 'quote', nom: 'Marie Dupont', email: 'marie@example.com', telephone: '06 12 34 56 78', prestation: 'Dépannage', message: 'Fuite sous l’évier.' };

describe('validation des demandes', () => {
  it('accepte une demande complète et normalise les champs', () => {
    const result = leadSchema.parse({ ...valid, nom: '  Marie Dupont  ', budget: '500 €' });
    expect(result.nom).toBe('Marie Dupont');
    expect(leadExtra(result)).toEqual({ budget: '500 €' });
  });
  it('refuse un email invalide, un message vide, un site inconnu et un téléphone farfelu', () => {
    expect(leadSchema.safeParse({ ...valid, email: 'pas-un-email' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, message: '   ' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, site: 'abc' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, telephone: '<script>' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, message: 'x'.repeat(4001) }).success).toBe(false);
  });
  it('garde le champ piège pour détecter les robots', () => {
    expect(leadSchema.parse({ ...valid, website: 'http://spam.example' }).website).toBe('http://spam.example');
    expect(leadSchema.parse(valid).website).toBe('');
  });
});

describe('email de notification', () => {
  it('résume la demande en texte brut, sans retour à la ligne dans l’objet', () => {
    const mail = leadNotificationEmail({ to: 'a@b.fr', companyName: 'Lefèvre Plomberie', kind: 'quote', name: 'Marie\nDupont', email: 'marie@example.com', phone: '0612345678', service: 'Dépannage', message: 'Fuite.', extra: { address: '3 rue des Lilas' }, inboxUrl: 'https://app.example/studio/x/requests' });
    expect(mail.subject).toBe('Nouvelle demande de devis — Marie Dupont');
    expect(mail.text).toContain('Adresse du chantier : 3 rue des Lilas');
    expect(mail.text).toContain('https://app.example/studio/x/requests');
    expect(mail.to).toBe('a@b.fr');
  });
});

describe('formulaires des sites', () => {
  const plombier = () => siteSchema.parse(samples.find((sample) => JSON.stringify(sample.site).includes('"contact"'))!.site);
  it('envoient au serveur de Mihoji (plus de mailto) avec champ piège et jeton du site', () => {
    const html = renderSite(plombier()).files['index.html'];
    expect(html).toContain('data-lead=');
    expect(html).not.toContain('action="mailto:');
    expect(html).toContain('name="website"');
    expect(html).toContain('{{site.id}}');
    expect(html).not.toContain('<script');
  });
  it('la publication rend l’action absolue et le jeton remplacé par l’identifiant du projet', () => {
    const form = leadFormOpen('contact');
    const published = injectSiteId(absolutizeLeadActions(form, 'https://app.mihoji.fr'), '0aea97ac-e5f3-4136-b0c4-de3aeb0081ab');
    expect(published).toContain('action="https://app.mihoji.fr/api/public/leads"');
    expect(published).toContain('value="0aea97ac-e5f3-4136-b0c4-de3aeb0081ab"');
    expect(published).not.toContain('{{site.id}}');
  });
});
