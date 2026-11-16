import Module from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv } from './e2e-guard';

// Prépare le compte connecté de TEST (commerçant fictif) utilisé par `npm run test:e2e:stripe` : le crée avec le vrai code de Mihoji (Accounts v2) s'il n'existe pas,
// affiche son état, et génère un lien d'inscription hébergé par Stripe (à usage unique, qui expire vite : ne le générer qu'au moment de l'ouvrir) tant que l'inscription n'est pas terminée.
// L'inscription contient un CAPTCHA : elle se fait à la main, une seule fois. Mode test uniquement (clé sk_test_).
const moduleInternals = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolveFilename = moduleInternals._resolveFilename;
moduleInternals._resolveFilename = (request, ...rest) => (request === 'server-only' ? resolve('scripts/empty-module.cjs') : resolveFilename(request, ...rest));
const FILE = 'e2e/.stripe-account.json';

// Constat (essayé le 2026-11-16) : on ne peut PAS compléter ce compte par l'API. Stripe refuse que la plateforme accepte les CGU « on behalf of accounts where requirement
// collection is owned by Stripe » (c'est le modèle « le commerçant encaisse directement »), et verrouille les champs d'activité une fois l'inscription hébergée ouverte.
// L'inscription hébergée (avec CAPTCHA) est donc la seule voie : le lien sort avec des adresses de retour et de rafraîchissement PUBLIQUES (pas 127.0.0.1).

async function main() {
  loadEnv();
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  if (!key.startsWith('sk_test_')) throw new Error('STRIPE_SECRET_KEY doit être une clé de test (sk_test_…)');
  const { StripePayments } = await import('../src/lib/payments/stripe');
  const payments = new StripePayments(key, process.env.STRIPE_WEBHOOK_SECRET);
  let id: string;
  if (existsSync(FILE)) id = (JSON.parse(readFileSync(FILE, 'utf8')) as { id: string }).id;
  else {
    id = (await payments.createAccount({ email: 'commercant-test@example.com', name: 'Boutique de test Mihoji' })).accountId;
    writeFileSync(FILE, JSON.stringify({ id }));
    console.log(`Compte connecté de test créé : …${id.slice(-6)} (enregistré dans ${FILE}, ignoré par git)`);
  }
  const status = await payments.accountStatus(id);
  console.log(`Compte …${id.slice(-6)} : ${status.ready ? 'PRÊT À ENCAISSER' : 'inscription à terminer'}`);
  if (!status.ready) {
    // Adresse publique du Codespace (NEXT_PUBLIC_SITE_URL) : le navigateur de la personne qui remplit le formulaire doit pouvoir joindre le retour et le rafraîchissement.
    const base = (process.env.STRIPE_TEST_PUBLIC_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
    if (!base.startsWith('https://')) throw new Error('Adresse publique introuvable : renseignez NEXT_PUBLIC_SITE_URL (https) ou STRIPE_TEST_PUBLIC_URL');
    const url = await payments.onboardingUrl({ accountId: id, returnUrl: `${base}/ok`, refreshUrl: `${base}/refresh` });
    console.log(`LIEN_INSCRIPTION ${url}`);
  }
}

main().then(() => process.exit(0), (error) => { console.error('ERREUR', String(error instanceof Error ? error.message : error).slice(0, 400)); process.exit(1); });
