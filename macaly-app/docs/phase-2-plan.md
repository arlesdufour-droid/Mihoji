# Plan de la phase 2

## Lot 0 — base de données et authentification

1. Ajouter la configuration Supabase SSR et le helper serveur `getSession()`.
2. Ajouter le middleware de rafraîchissement et de protection des routes.
3. Ajouter le schéma Drizzle, la migration SQL versionnée et le seed.
4. Faire basculer les requêtes de facturation vers PostgreSQL quand `DATABASE_URL` est défini, avec le mode démo en développement sinon.
5. Ajouter la page de connexion par lien magique, Google optionnel et le bandeau « Demo mode ».
6. Documenter les variables d’environnement et valider avec build, lint et tests.

## Lots suivants

- Lot 1 : routeur multi-modèles et migration des modèles IA.
- Lots 2a/2b : moteur de génération et bac à sable.
- Lot 3 : crédits prévisibles.
- Lot 4 : audit de sécurité.
- Lot 5 : points de restauration et publication.
- Lot 6 : SEO par défaut.
