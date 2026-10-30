# Préparation Stripe

Cette phase prépare uniquement le schéma et le flux prévu ; aucun appel Stripe n'est encore branché.

- Le checkout sera créé côté serveur uniquement, après vérification de la session et de la formule.
- Les crédits ne seront attribués qu'à la réception d'un webhook `invoice.paid`.
- La table `stripe_events` dédupliquera les événements grâce à l'identifiant Stripe comme clé primaire.
- Chaque nouvelle période mensuelle rechargera les crédits selon la formule active.
- Un paiement échoué fera passer l'abonnement à `past_due`; après la politique de grâce, il pourra être `canceled`.
- Les identifiants de prix sont configurés par `STRIPE_PRICE_*` et ne sont jamais exposés au navigateur.
