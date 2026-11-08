// Fournisseur de paiement (Stripe Connect). Le paiement est encaissé directement sur le compte Stripe du commerçant : Mihoji ne touche jamais l'argent.
// Implémentation réelle (stripe.ts) et simulée (simulated.ts, développement sans clé seulement). En production, une clé absente est une erreur explicite.

export type CheckoutInput = { accountId: string; amountCents: number; currency: 'eur'; description: string; successUrl: string; cancelUrl: string; bookingId: string; customerEmail?: string };
export type Checkout = { id: string; url: string };
export type PaymentEvent = { type: 'paid' | 'expired'; bookingId: string; sessionId: string; paymentIntentId: string | null };

export interface PaymentsProvider {
  readonly simulated: boolean;
  createAccount(): Promise<{ accountId: string }>;
  onboardingUrl(input: { accountId: string; returnUrl: string; refreshUrl: string }): Promise<string>;
  accountStatus(accountId: string): Promise<{ ready: boolean; label: string }>;
  createCheckout(input: CheckoutInput): Promise<Checkout>;
  refund(input: { accountId: string; paymentIntentId: string }): Promise<{ id: string }>;
  parseWebhook(rawBody: string, signature: string | null): Promise<PaymentEvent | null>;
}
