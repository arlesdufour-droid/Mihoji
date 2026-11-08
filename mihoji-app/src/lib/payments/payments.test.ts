import { describe, expect, it } from 'vitest';
import { SimulatedPayments, SIM_SESSION_PREFIX } from './simulated';
import { bookingCustomerEmail, bookingMerchantEmail } from '../bookings/email';
import { absolutizeLeadActions } from '../site/lead-form';

describe('paiement simulé', () => {
  const provider = new SimulatedPayments('https://app.example');
  it('crée un compte de test, une session de paiement liée au rendez-vous et un remboursement', async () => {
    const { accountId } = await provider.createAccount();
    expect(accountId).toMatch(/^acct_sim_/);
    expect((await provider.accountStatus(accountId)).ready).toBe(true);
    expect((await provider.accountStatus('acct_reel_123')).ready).toBe(false);
    const checkout = await provider.createCheckout({ accountId, amountCents: 2670, currency: 'eur', description: 'Acompte', successUrl: 'x', cancelUrl: 'y', bookingId: 'b1' });
    expect(checkout).toEqual({ id: `${SIM_SESSION_PREFIX}b1`, url: `https://app.example/api/public/payments/sim?session=${SIM_SESSION_PREFIX}b1` });
    expect((await provider.refund({ accountId, paymentIntentId: 'sim_pi_abcdef12' })).id).toContain('sim_re_');
    expect(provider.simulated).toBe(true);
  });
});

describe('emails de rendez-vous et publication', () => {
  const info = { companyName: 'Lefèvre Plomberie', service: 'Diagnostic chaudière', startsAt: new Date('2026-11-10T09:00:00Z'), customerName: 'Marie', customerEmail: 'm@example.com', customerPhone: '0612345678', paidCents: 2670, totalCents: 8900, notes: '' };
  it('le client est prévenu du reste à payer sur place, le commerçant du versement direct', () => {
    expect(bookingCustomerEmail(info).text).toContain('Acompte payé : 26,70 € (reste 62,30 € à régler sur place)');
    expect(bookingCustomerEmail(info).text).toContain('10 h 00'.replace(' h ', ':'));
    expect(bookingMerchantEmail({ ...info, to: 'a@b.fr' }).text).toContain('versé directement sur votre compte Stripe');
  });
  it('à la publication, le formulaire de rendez-vous pointe vers l’application', () => {
    expect(absolutizeLeadActions('<form action="/api/public/bookings">', 'https://app.mihoji.fr')).toContain('action="https://app.mihoji.fr/api/public/bookings"');
  });
});

import { paymentsMode } from './mode';

describe('choix du fournisseur de paiement', () => {
  it('clé de test : Stripe ; sans clé : simulation en développement, erreur explicite en production', () => {
    expect(paymentsMode({ STRIPE_SECRET_KEY: 'sk_test_123' })).toBe('stripe');
    expect(paymentsMode({})).toBe('simulated');
    expect(() => paymentsMode({ APP_ENV: 'production' })).toThrow('stripe_not_configured');
    expect(() => paymentsMode({ NODE_ENV: 'production' })).toThrow('stripe_not_configured');
  });
  it('refuse toujours une clé du mode réel (règle du projet)', () => {
    expect(() => paymentsMode({ STRIPE_SECRET_KEY: 'sk_live_123' })).toThrow('stripe_live_mode_forbidden');
    expect(() => paymentsMode({ STRIPE_SECRET_KEY: 'rk_live_123' })).toThrow('stripe_live_mode_forbidden');
  });
});
