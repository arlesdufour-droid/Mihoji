# Avancement de la phase 2

## Lot 0 — base de données et authentification

### Fait

- Schéma Drizzle et migration versionnée pour `users`, `workspaces`, `workspace_members` et `subscriptions`.
- Client PostgreSQL serveur et script `npm run db:seed`.
- Auth Supabase SSR avec `getSession()`, middleware de protection de `/studio` et `/settings`, et page `/login`.
- Connexion par lien magique et bouton Google quand Supabase est configuré.
- Requêtes de solde et d'abonnement branchées sur PostgreSQL quand `DATABASE_URL` existe.
- Mode démo automatique en développement sans base, avec bandeau visible.
- Variables documentées dans `.env.example`; `.env.local` n'a pas été modifié.

### Réel

- Supabase Auth, PostgreSQL et les soldes/abonnements quand les variables sont configurées.

### Simulé

- En développement sans `DATABASE_URL`, l'utilisateur et les données de démonstration sont fournis localement.
- Les données d'usage et les factures restent celles de la démo, car leurs tables sont prévues dans les lots suivants.

### Stub restant

- La synchronisation automatique entre un utilisateur Supabase Auth et la table `users` sera complétée avec les besoins des lots suivants.

### Validation

- `npm run build` ✅
- `npm run lint` ✅
- `npx vitest run` ✅ (2 tests)

### Configuration à faire

1. Créer un projet Supabase en région UE.
2. Dans **Project Settings → API**, copier `Project URL` dans `NEXT_PUBLIC_SUPABASE_URL` et la clé publishable/anon dans `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Dans **Project Settings → Database → Connect**, copier la chaîne PostgreSQL dans `DATABASE_URL`.
4. Copier la clé `service_role` dans `SUPABASE_SERVICE_ROLE_KEY` uniquement côté serveur.
5. Ajouter ces valeurs comme secrets Codespaces ou dans `macaly-app/.env.local`, puis exécuter `npm run db:seed` depuis `macaly-app`.
6. Dans Supabase Auth, activer Email et, si souhaité, Google avec ses identifiants OAuth.
