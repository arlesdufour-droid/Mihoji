import { randomBytes } from 'node:crypto';
import type { Checkout, CheckoutInput, PaymentEvent, PaymentsProvider } from './types';

// Simulation de Stripe (développement sans STRIPE_SECRET_KEY, tests automatiques) : une page de paiement de test imite Stripe Checkout
// (carte 4242 4242 4242 4242 acceptée, 4000 0000 0000 0002 refusée). Jamais utilisée en production.
export const SIM_SESSION_PREFIX = 'sim_cs_';

export class SimulatedPayments implements PaymentsProvider {
  readonly simulated = true;
  constructor(private readonly origin: string) {}
  async createAccount() { return { accountId: `acct_sim_${randomBytes(6).toString('hex')}` }; }
  async onboardingUrl(input: { accountId: string; returnUrl: string; refreshUrl: string }) { void input.refreshUrl; return input.returnUrl; }
  async accountStatus(accountId: string) { return { ready: accountId.startsWith('acct_sim_'), label: `Compte Stripe de test (${accountId.slice(-6)})` }; }
  async createCheckout(input: CheckoutInput): Promise<Checkout> {
    const id = `${SIM_SESSION_PREFIX}${input.bookingId}`;
    return { id, url: `${this.origin}/api/public/payments/sim?session=${id}` };
  }
  async refund(input: { accountId: string; paymentIntentId: string }) { return { id: `sim_re_${input.paymentIntentId.slice(-8)}` }; }
  async parseWebhook(): Promise<PaymentEvent | null> { return null; }
}
