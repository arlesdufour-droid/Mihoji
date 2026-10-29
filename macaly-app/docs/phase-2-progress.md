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

## Lot 1 — routeur multi-modèles

### Fait

- Routeur par tâche avec modèles fast, strong et fallback configurables.
- Fournisseurs Groq et mock derrière l'interface `LlmProvider`.
- Vérification des modèles au premier appel puis avec cache d'une heure.
- Bascule sur le modèle de secours pour les modèles retirés et erreurs serveur.
- Route `/api/generate` branchée sur le routeur et protégée par `getSession()`.
- Section AI status visible au propriétaire dans les réglages généraux.
- Tests de routage et absence de modèle obsolète dans le code applicatif.

### Réel

- Les appels Groq et la liste distante des modèles sont réels si `GROQ_API_KEY` est configurée.

### Simulé

- Sans clé Groq en développement, le fournisseur mock répond sans appel externe.

### Stub restant

- La disponibilité est affichée au niveau de l'espace; le rôle propriétaire provient actuellement des métadonnées Supabase et sera renforcé par les membres de workspace dans les lots de données suivants.

### Validation

- `npm run build` ✅
- `npm run lint` ✅
- `npx vitest run` ✅ (4 tests)

## Lot 2a — moteur de génération avec bac à sable simulé

### Fait

- Schéma et migration des projets, fichiers, blobs dédupliqués et versions.
- Protocole d'opérations Zod avec validation des chemins et rejet des éditions ambiguës.
- Bac à sable simulé avec installation, build, URL d'aperçu et marqueur d'erreur contrôlé.
- Boucle de génération avec versions de travail, événements de progression, trois corrections maximum et état `built`/`failed`/`draft`.
- Gabarit de base minimal Next.js/Tailwind.

### Réel

- Validation des opérations, hachage des fichiers et logique de boucle sont exécutables et testés.

### Simulé

- L'exécution `npm run build` et l'URL de prévisualisation sont simulées dans `MockSandboxProvider`.
- Le branchement de cette boucle à l'interface Studio reste à faire.

### Stub restant

- Persistance applicative des versions et affichage de l'onglet Code seront reliés aux écrans Studio dans un complément dédié.

### Validation

- `npm run build` ✅
- `npm run lint` ✅
- `npx vitest run` ✅ (6 tests)

## Lot 2b — sélection du bac à sable réel

### Fait

- Sélecteur unique : E2B si `E2B_API_KEY` existe, mock en développement sinon.
- En production, une clé E2B absente renvoie `e2b_not_configured`.
- Interface E2B isolée derrière `SandboxProvider` pour éviter de coupler le moteur.

### Blocage externe

- L'implémentation E2B réelle est bloquée par l'absence de compte, de quota et de validation du SDK/licence dans cet environnement; elle renvoie une erreur explicite plutôt qu'une fausse exécution.
- Pour débloquer : créer un compte E2B, obtenir `E2B_API_KEY` et l'ajouter aux secrets Codespaces ou à `macaly-app/.env.local` sans la committer.

### Réel et simulé

- Le contrat de sélection et les erreurs de configuration sont réels.
- Le mock reste actif en développement; l'exécution E2B réelle reste en stub bloqué.

## Lot 3 — crédits prévisibles

### Fait

- Table `credit_ledger` et migration dédiée.
- Débit PostgreSQL transactionnel avec contrôle du solde et journalisation.
- Estimation basse/haute selon le contexte et la tâche, affichée dans le compositeur.
- Bascule Plan/Build et transmission de la tâche au routeur.

### Réel

- Débits et écritures du ledger sont réels avec PostgreSQL configuré.

### Simulé

- Le mode démo conserve les valeurs de démonstration et ne persiste pas les débits.

### Stub restant

- Les corrections gratuites, le plafond configurable et l'agrégation complète de la page Usage seront reliés aux écrans et à la boucle de génération dans les lots sécurité/restauration.

### Validation

- `npm run build` ✅
- `npm run lint` ✅
- `npx vitest run` ✅ (7 tests)
