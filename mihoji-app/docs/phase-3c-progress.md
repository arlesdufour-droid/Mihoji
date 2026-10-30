# Avancement de la phase 3c

## Lots terminés

- **Lot 1 :** requêtes de facturation restaurées ; les erreurs de base sont journalisées et remontées au lieu d'utiliser de faux chiffres.
- **Lot 2 :** RLS activée sur toutes les tables métier, privilèges publics révoqués, défauts de crédits du schéma fixés à zéro.
- **Lot 3 :** session, espace, rôle, abonnement Free et appartenance sont issus de la base ; accès aux projets et onglets contrôlés.
- **Lot 4 :** proxy Next.js 16 en place pour protéger les pages et les API.
- **Lot 5 :** modèles Groq, usage du streaming, plafonds, limites d'entrée et débit des crédits fiabilisés.
- **Lot 6 :** schéma Stripe préparé sans intégration de checkout/webhook.

## Vérification

Dans `mihoji-app` :

```bash
npm run build
npm run lint
npx tsc --noEmit
npx vitest run
```

Les quatre commandes passent après génération du build. L'application utilise encore les données de démonstration lorsque la configuration serveur est absente.

## Points ouverts

- Les migrations SQL et le test REST Supabase doivent être exécutés avec `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` et la clé anon d'un projet réel.
- Les tests dédiés aux deux formats d'usage Groq, à l'interruption du flux et aux limites de l'API restent à compléter.
- L'historique serveur `chat_messages` n'est pas encore implémenté.
- Le document `docs/phase-3b-consolidation.md` n'est pas présent dans le dépôt ; la phase 3b n'a donc pas pu être démarrée.
