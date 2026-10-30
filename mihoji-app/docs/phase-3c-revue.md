# Mission phase 3c : corrections issues de la revue de code

Relis ce fichier au début de chaque lot. Applique les règles de `AGENTS.md`. Un commit par lot (« Phase 3c – Lot X : … »). `npm run build`, `npm run lint` et `npx vitest run` doivent passer à la fin de chaque lot.

## Lot 1 : réparer le build
- `src/lib/billing/queries.ts` a été écrasé : il ne contient plus que `getCreditBalance`, sans ses imports. Reconstruis le fichier complet avec les imports corrects (`getDb`, `subscriptions`, `eq`, `canUseDemoData`…) et les fonctions `getCreditBalance`, `getSubscription`, `getUsageSnapshot`, `getInvoices` utilisées par les pages.
- Supprime le `try/catch` qui renvoie silencieusement les données de démo en cas d'erreur. En mode réel, une erreur de base doit être visible (log + message d'erreur clair), jamais masquée par des faux chiffres.
- Lance `npx tsc --noEmit` et corrige toutes les erreurs de type.

## Lot 2 : sécuriser la base Supabase
- Crée une migration qui active la RLS (`ALTER TABLE … ENABLE ROW LEVEL SECURITY`) sur TOUTES les tables du schéma public : users, workspaces, workspace_members, subscriptions, projects, file_blobs, project_files, project_versions, credit_ledger, et toute autre table métier. N'ajoute aucune politique d'accès pour `anon` ni `authenticated` : seul le serveur, via `DATABASE_URL`, accède aux données.
- Ajoute aussi `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;`
- Exécute la migration, puis vérifie avec une requête REST utilisant la clé anon (`GET {SUPABASE_URL}/rest/v1/subscriptions` avec l'en-tête `apikey`) que la réponse est vide ou refusée. Montre-moi le résultat.
- Retire de la migration et du schéma Drizzle les valeurs par défaut de démo de `subscriptions` (136400, 2500000) : défauts à 0, et l'allocation mensuelle vient de `lib/plans.ts`.

## Lot 3 : identité, espaces et appartenance
- `getSession()` ne doit plus lire `workspace_id` ni `role` dans `user_metadata` (modifiables par l'utilisateur). Lis l'espace actif et le rôle dans `workspace_members`, à partir de l'identifiant de l'utilisateur Supabase.
- À la première connexion d'un utilisateur, crée de façon idempotente : la ligne `users` (même id que `auth.users`), un espace, son abonnement Free et la ligne `workspace_members` (owner).
- Supprime toutes les valeurs en dur `'demo-workspace'` et `projectId: 'demo'` hors du mode démo. Le layout du Studio, la Facturation, l'Utilisation et la route `/api/generate` utilisent `session.workspaceId`.
- Ajoute un helper `assertProjectAccess(session, projectId)` qui vérifie que le projet appartient à l'espace de l'utilisateur. Appelle-le dans le layout du Studio et dans `/api/generate`. Un projet inconnu renvoie une 404.
- Vérifie que l'onglet demandé dans `/studio/[projectId]/[tab]` fait partie de la liste des onglets connus, sinon renvoie une 404.

## Lot 4 : protection des routes
- Déplace `middleware.ts` vers `src/proxy.ts` (convention de Next.js 16 avec un dossier `src`), adapte le nom de la fonction exportée si nécessaire, et vérifie dans les logs que le proxy s'exécute bien.
- Protège `/studio`, `/settings`, `/onboarding` et `/api` (sauf les routes publiques explicitement listées, par exemple les futurs webhooks).
- Test : déconnecté, l'accès à `/studio/x/preview` redirige vers `/login`, et `POST /api/generate` renvoie 401.

## Lot 5 : fiabiliser l'IA et les crédits
- Corrige `defaultGroqModel` : `qwen/qwen3.6-27b` (et non `qwen3.8`). Au démarrage, vérifie les modèles configurés contre `/models` et logge clairement ceux qui sont absents.
- Supprime la prise en compte de `GROQ_MODEL` dans `routing.ts`.
- En développement, n'utilise plus la réponse simulée quand une clé Groq EST présente et qu'un appel échoue : affiche l'erreur réelle. Le mode simulé est réservé à l'absence de clé.
- Dans le flux Groq, ajoute `stream_options: { include_usage: true }` et lis l'usage dans `usage` OU `x_groq.usage`. Récupère séparément `prompt_tokens` et `completion_tokens`.
- Corrige le délai : le timeout de 30 s (inactivité) doit rester actif pendant toute la durée du flux, et être annulé seulement à la fin du flux ou à son interruption.
- Débite toujours ce qui a été consommé, y compris en cas d'interruption par l'utilisateur ou d'erreur en cours de flux. Si l'usage exact est inconnu, estime-le à partir des caractères envoyés et reçus.
- Avant l'appel, calcule un plafond : `max_tokens` = min(plafond par tâche, solde restant converti en tokens). Refuse avec 402 si le solde ne permet pas une requête minimale.
- Limite les entrées : 8 000 caractères par message et 30 messages maximum. Rejette avec 413 au-delà.
- Ne fais plus confiance aux messages « assistant » envoyés par le navigateur : l'historique est reconstruit côté serveur à partir de la base (table `chat_messages` liée au projet, à créer si nécessaire).
- Ajoute une limite de fréquence simple par utilisateur (par exemple 20 requêtes par minute) sur `/api/generate`.
- Le grand livre enregistre le vrai modèle, `promptTokens`, `completionTokens`, le `projectId`, et un `shadowCost` en euros estimés (tarifs par modèle dans `lib/ai/pricing.ts`).
- Le solde a une seule source de vérité : soit le grand livre, avec les compteurs de `subscriptions` recalculés, soit les compteurs, avec le grand livre comme journal. Choisis, documente ton choix dans `docs/phase-3c-progress.md`, et garantis leur cohérence par transaction.
- Écris des tests pour : lecture de l'usage Groq (les deux formats), débit en cas d'interruption, plafond `max_tokens`, limites d'entrée.

## Lot 6 : préparation de Stripe (sans brancher Stripe)
- Ajoute à `subscriptions` : `stripe_customer_id`, `stripe_subscription_id`, `status` (`active`, `past_due`, `canceled`, `trialing`), `current_period_start`, `current_period_end`.
- Crée une table `stripe_events` (`id` de l'événement Stripe en clé primaire, `type`, `processed_at`) pour garantir qu'un même webhook n'est jamais traité deux fois.
- Dans `lib/plans.ts`, ajoute pour chaque formule un champ `stripePriceId` lu depuis des variables d'environnement (documentées dans `.env.example`, vides pour l'instant).
- Documente dans `docs/stripe-plan.md` le flux prévu : checkout côté serveur uniquement ; crédits attribués uniquement à la réception du webhook `invoice.paid` ; recharge mensuelle des crédits ; gestion des échecs de paiement. Ne code pas encore l'intégration Stripe.

## Fin de mission
Mets à jour `docs/phase-3c-progress.md` avec ce qui a été corrigé, comment le vérifier, et tout point resté ouvert. Fais un push vers GitHub sur `main`.