import 'server-only';

import Stripe from 'stripe';
import type { Checkout, CheckoutInput, PaymentEvent, PaymentsProvider } from './types';

// Implémentation réelle (mode test avec une clé sk_test_…) : comptes connectés (Accounts v2), paiement direct sur le compte du commerçant.
export class StripePayments implements PaymentsProvider {
  readonly simulated = false;
  private readonly stripe: Stripe;
  constructor(secretKey: string, private readonly webhookSecret: string | undefined) {
    this.stripe = new Stripe(secretKey);
  }
  // Comptes connectés par l'API « Accounts v2 » (l'ancienne API de comptes est refusée par une plateforme en gestion de risque par Stripe, et le type « express »
  // est incompatible avec le modèle « le commerçant encaisse directement ») : le commerçant a son propre tableau de bord Stripe, paie les frais, Stripe porte le risque.
  // Une plateforme française doit passer par un jeton de compte. L'inscription (identité, IBAN) est hébergée par Stripe ; Mihoji ne la voit jamais.
  async createAccount(profile: { email?: string; name?: string } = {}) {
    const token = await this.stripe.v2.core.accountTokens.create({ contact_email: profile.email, display_name: profile.name?.slice(0, 100) });
    const account = await this.stripe.v2.core.accounts.create({
      account_token: token.id,
      dashboard: 'full',
      identity: { country: 'FR' },
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
      defaults: { currency: 'eur', responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' }, locales: ['fr-FR'] },
    });
    return { accountId: account.id };
  }
  async onboardingUrl(input: { accountId: string; returnUrl: string; refreshUrl: string }) {
    const link = await this.stripe.v2.core.accountLinks.create({ account: input.accountId, use_case: { type: 'account_onboarding', account_onboarding: { return_url: input.returnUrl, refresh_url: input.refreshUrl } } });
    return link.url;
  }
  // Prêt à encaisser = la capacité de paiement par carte du compte est « active ».
  async accountStatus(accountId: string) {
    const account = await this.stripe.v2.core.accounts.retrieve(accountId, { include: ['configuration.merchant'] });
    const status = account.configuration?.merchant?.capabilities?.card_payments?.status;
    return { ready: status === 'active', label: account.display_name || account.contact_email || `Compte Stripe ${accountId.slice(-6)}` };
  }
  async createCheckout(input: CheckoutInput): Promise<Checkout> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      // Le commerçant vend en euros : pas de conversion de devise proposée au client (Adaptive Pricing présélectionnait des livres sterling dans le test réel).
      adaptive_pricing: { enabled: false },
      line_items: [{ quantity: 1, price_data: { currency: input.currency, unit_amount: input.amountCents, product_data: { name: input.description } } }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.customerEmail,
      metadata: { bookingId: input.bookingId },
      payment_intent_data: { metadata: { bookingId: input.bookingId } },
    }, { stripeAccount: input.accountId });
    return { id: session.id, url: session.url ?? input.cancelUrl };
  }
  async refund(input: { accountId: string; paymentIntentId: string }) {
    const refund = await this.stripe.refunds.create({ payment_intent: input.paymentIntentId }, { stripeAccount: input.accountId });
    return { id: refund.id };
  }
  async parseWebhook(rawBody: string, signature: string | null): Promise<PaymentEvent | null> {
    if (!this.webhookSecret || !signature) throw new Error('stripe_webhook_not_configured');
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.expired') return null;
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (!bookingId) return null;
    const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;
    return { type: event.type === 'checkout.session.completed' && session.payment_status === 'paid' ? 'paid' : 'expired', bookingId, sessionId: session.id, paymentIntentId: paymentIntent };
  }
}
