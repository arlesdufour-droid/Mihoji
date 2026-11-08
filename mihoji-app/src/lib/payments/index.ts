import 'server-only';

import { paymentsMode } from './mode';
import { SimulatedPayments } from './simulated';
import { StripePayments } from './stripe';
import type { PaymentsProvider } from './types';

// Clé présente : Stripe réel (mode test avec sk_test_…). Clé absente : simulation en développement, erreur explicite en production.
export function getPaymentsProvider(origin: string): PaymentsProvider {
  if (paymentsMode(process.env) === 'stripe') return new StripePayments(process.env.STRIPE_SECRET_KEY!.trim(), process.env.STRIPE_WEBHOOK_SECRET?.trim());
  return new SimulatedPayments(origin);
}
