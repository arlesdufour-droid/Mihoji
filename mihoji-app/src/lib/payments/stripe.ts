import 'server-only';

import Stripe from 'stripe';
import type { Checkout, CheckoutInput, PaymentEvent, PaymentsProvider } from './types';

// Implémentation réelle (mode test avec une clé sk_test_…) : comptes Express connectés, paiement direct sur le compte du commerçant.
export class StripePayments implements PaymentsProvider {
  readonly simulated = false;
  private readonly stripe: Stripe;
  constructor(secretKey: string, private readonly webhookSecret: string | undefined) {
    this.stripe = new Stripe(secretKey);
  }
  async createAccount() {
    const account = await this.stripe.accounts.create({ type: 'express', country: 'FR', capabilities: { card_payments: { requested: true }, transfers: { requested: true } } });
    return { accountId: account.id };
  }
  async onboardingUrl(input: { accountId: string; returnUrl: string; refreshUrl: string }) {
    const link = await this.stripe.accountLinks.create({ account: input.accountId, return_url: input.returnUrl, refresh_url: input.refreshUrl, type: 'account_onboarding' });
    return link.url;
  }
  async accountStatus(accountId: string) {
    const account = await this.stripe.accounts.retrieve(accountId);
    return { ready: Boolean(account.charges_enabled), label: account.business_profile?.name || account.email || `Compte Stripe ${accountId.slice(-6)}` };
  }
  async createCheckout(input: CheckoutInput): Promise<Checkout> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
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
