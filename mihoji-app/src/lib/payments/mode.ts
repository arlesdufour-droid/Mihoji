// Choix du fournisseur de paiement (logique pure, testée) : clé présente = Stripe réel (mode TEST uniquement), clé absente = simulation hors production.
export function paymentsMode(env: Record<string, string | undefined>): 'stripe' | 'simulated' {
  const key = env.STRIPE_SECRET_KEY?.trim();
  if (key) {
    if (key.startsWith('sk_live_') || key.startsWith('rk_live_')) throw new Error('stripe_live_mode_forbidden'); // règle du projet : jamais de mode réel
    return 'stripe';
  }
  if (env.NODE_ENV === 'production' || env.APP_ENV === 'production') throw new Error('stripe_not_configured');
  return 'simulated';
}
