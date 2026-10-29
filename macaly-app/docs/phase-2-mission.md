# Mission : rendre le moteur de génération de Mihoji fiable, prévisible et sûr

Ce document est stocké dans `docs/phase-2-mission.md`. C'est ta référence pour toute la phase 2 : relis-le au début de chaque lot.

L'interface de Mihoji est déjà en place et sauvegardée dans un commit : Studio à onglets, facturation, jauges, menu compte, design system « Signature » et route `app/api/generate/route.ts` branchée sur Groq.

Cette phase ne touche pas au visuel, sauf mention contraire. Elle construit ce qui manque pour que Mihoji génère de vraies apps qui fonctionnent :
- une base de données et une authentification ;
- un modèle IA actif et un routage entre modèles ;
- un moteur de génération avec build réel et autocorrection ;
- des crédits prévisibles ;
- un audit de sécurité avant publication ;
- des points de restauration ;
- un SEO solide par défaut.

## Règles générales

1. **Commence par lire le dépôt.** Lis l'existant (route generate, `lib/ai/*`, `lib/billing/*`, `AGENTS.md`) et écris ton plan dans `docs/phase-2-plan.md` avant de coder.
2. **Copie cette section « Règles générales » dans `AGENTS.md`** (en remplaçant toute version précédente), pour qu'elle s'applique aussi aux conversations futures.
3. **Livre lot par lot**, dans l'ordre 0 → 1 → 2a → 2b → 3 → 4 → 5 → 6, avec un commit Git par lot (message : « Phase 2 – Lot X : … »). Après chaque lot :
   - `npm run build`, `npm run lint` et `npx vitest run` passent ;
   - tu résumes dans `docs/phase-2-progress.md` ce qui est fait, ce qui est réel, ce qui est simulé et ce qui reste en stub.
4. **Ne commence jamais un lot si le précédent n'est pas validé**, sauf exception prévue explicitement (voir lot 2b).
5. **Fournisseurs externes derrière une interface.** Tout fournisseur externe (base de données, modèle IA, bac à sable d'exécution, hébergement) passe par une interface TypeScript avec deux implémentations : la vraie, et une simulée active en dev quand la clé correspondante est absente. En production, une clé absente renvoie une erreur explicite, jamais une simulation.
6. **Aucun secret côté client.** Toute nouvelle variable d'environnement est documentée dans `.env.example`. Ne modifie jamais `.env.local` toi-même : indique-moi quelles valeurs y ajouter.
7. **Écris des tests unitaires (Vitest)** pour toute logique pure : routage des modèles, application des modifications, estimation des crédits, règles des audits de sécurité et SEO.
8. **En cas de blocage externe** (compte, clé, quota, licence, API indisponible), ne contourne pas le problème en dégradant un lot déjà validé. Documente le blocage dans `docs/phase-2-progress.md`, explique-moi en une phrase simple ce que je dois faire, et passe au lot suivant s'il n'en dépend pas.
9. **À la fin de chaque lot, donne-moi un résumé court en français simple** : ce qui marche, comment le tester dans l'aperçu, et ce que je dois faire de mon côté (par exemple créer un compte ou ajouter une clé).

---

## Lot 0 : base de données et authentification (prérequis)

Le dépôt n'a encore ni base de données ni authentification.

**Base de données**
- PostgreSQL via Supabase (région UE), avec Drizzle ORM et migrations versionnées dans `db/migrations/`.
- Variables d'environnement :
  - `DATABASE_URL` ;
  - `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publiques par nature) ;
  - `SUPABASE_SERVICE_ROLE_KEY` (serveur uniquement, jamais importée dans un composant client).
- Tables de ce lot : `users`, `workspaces`, `workspace_members`, `subscriptions`. Les autres tables arrivent avec leurs lots.

**Authentification**
- Supabase Auth : connexion par email avec lien magique, et Google en option si les clés sont présentes.
- Helper `getSession()` dans `lib/auth.ts`.
- Middleware qui protège `/studio` et `/settings` et redirige vers `/login`.
- Page `/login` simple, cohérente avec le design existant.

**Données de démo et secours**
- Script `npm run db:seed` qui crée un utilisateur, un espace et les valeurs de démo actuelles (formule Starter, 136 400 crédits restants, etc.), pour que l'interface reste identique.
- Sans `DATABASE_URL` en dev, l'app continue de fonctionner avec `lib/billing/demo-data.ts` et un utilisateur de démo connecté automatiquement. Un bandeau discret « Demo mode » le signale.
- Toutes les fonctions de `lib/billing/queries.ts` lisent la vraie base si elle est configurée, sinon les données de démo.

**Ce que tu me dis à la fin du lot**
Les étapes exactes pour créer le projet Supabase, où trouver chaque clé, et où la coller (secrets Codespaces ou `.env.local`).

---

## Lot 1 : migration du modèle et routeur multi-modèles (URGENT)

Le modèle `llama-3.3-70b-versatile` a été retiré par Groq le 16 août 2026. Les appels échouent.

**Configuration**
- Remplace le modèle unique par un routeur de tâches dans `lib/ai/router.ts`.
- Tâches : `chat`, `plan`, `generate`, `edit`, `fix`, `summarize`.
- Variables d'environnement :
  - `AI_MODEL_FAST` (défaut `openai/gpt-oss-20b`), pour `chat`, `summarize` et les petites modifications `edit` ;
  - `AI_MODEL_STRONG` (défaut `openai/gpt-oss-120b`), pour `plan`, `generate` et `fix` ;
  - `AI_MODEL_FALLBACK` (défaut `qwen/qwen3.6-27b`), utilisé si le modèle principal renvoie `model_decommissioned`, `model_not_found` ou une 5xx répétée.

**Vérification au démarrage**
- Au premier appel, puis toutes les heures (cache mémoire), interroge `GET https://api.groq.com/openai/v1/models`.
- Si un modèle configuré n'est pas dans la liste :
  - log d'erreur clair ;
  - bascule automatique sur le modèle de secours.

**Abstraction fournisseur**
- `lib/ai/providers/groq.ts` implémente l'interface :
  ```
  interface LlmProvider { stream(req): AsyncIterable<Chunk>; complete(req): Promise<Result>; listModels(): Promise<string[]> }
  ```
- `lib/ai/providers/mock.ts` sert pour le dev.
- La route `/api/generate` ne connaît que le routeur, jamais Groq directement.
- La route vérifie maintenant la session via `getSession()` (lot 0).
- Supprime toute référence à `llama-3.3-70b-versatile` et à `GROQ_MODEL` dans le code, la documentation, les réglages (`lib/ai/models.ts`) et `.env.example`.

**Page de diagnostic**
`/settings/general` gagne une section « AI status », visible du propriétaire de l'espace uniquement :
- modèles configurés ;
- disponibilité de chaque modèle ;
- date de dernière vérification.

**Tests**
- Routage par tâche.
- Bascule sur le modèle de secours en cas de modèle retiré.
- Aucune clé exposée.

---

## Lot 2 : moteur de génération

Ce lot est le plus lourd de la phase. Il est découpé en deux sous-lots, livrés et validés séparément :
- **2a** : tout le moteur, avec un bac à sable simulé ;
- **2b** : branchement du vrai bac à sable.

### Lot 2a : projet versionné, modifications ciblées, boucle complète (bac à sable simulé)

#### 2a.1 Représentation du projet

Chaque projet est un ensemble de fichiers stockés en base, dans les tables :
- `projects` : `id`, `workspaceId`, `name`, `currentVersionId`, `createdAt` ;
- `project_files` : `projectId`, `path`, `content`, `hash`, `updatedAt` ;
- `project_versions` : `id`, `projectId`, `parentVersionId`, `createdAt`, `createdBy` (`user` | `agent`), `summary`, `filesSnapshot` (manifeste path → hash), `status` (`draft` | `built` | `failed` | `published`).

Le contenu des fichiers est dédupliqué par hash (table `file_blobs`).

Un nouveau projet part d'un gabarit de base : Next.js App Router + Tailwind, stocké dans `templates/base/` (son contenu SEO est précisé au lot 6).

#### 2a.2 Protocole de modification

L'agent ne renvoie plus du texte libre. Il renvoie une liste d'opérations validée par zod :

```
{ "summary": string,
  "operations": [
    { "op": "create", "path": string, "content": string },
    { "op": "edit", "path": string, "search": string, "replace": string },
    { "op": "delete", "path": string }
  ] }
```

- `edit` remplace un bloc exact. Si `search` est introuvable ou présent plusieurs fois, l'opération est rejetée et renvoyée au modèle avec l'erreur. Maximum 2 tentatives.
- Chemins autorisés : à l'intérieur du projet uniquement. Rejette `..`, les chemins absolus, `.env*` et `node_modules`.
- Le prompt système (`lib/ai/system-prompt.ts`) explique ce format, fournit l'arborescence du projet et ne joint que les fichiers pertinents. Le contexte est sélectionné par `lib/ai/context.ts` : fichiers mentionnés, fichiers importés par ceux-ci, et fichiers récemment modifiés.
- Le flux affiché dans le chat montre, en temps réel :
  - le résumé ;
  - la liste des fichiers touchés ;
  - l'opération en cours sur chaque fichier.

#### 2a.3 Interface du bac à sable et implémentation simulée

Crée l'interface dans `lib/sandbox/index.ts` :
```
interface SandboxProvider {
  create(projectId): Promise<SandboxHandle>
  writeFiles(handle, files): Promise<void>
  run(handle, cmd, { timeoutMs }): Promise<{ exitCode, stdout, stderr }>
  previewUrl(handle): Promise<string>
  destroy(handle): Promise<void>
}
```

Implémentation `lib/sandbox/mock.ts` :
- simule `npm install` et `npm run build` ;
- renvoie une URL d'aperçu statique ;
- permet de simuler un échec de build via un marqueur dans le code (ex. un fichier contenant `// MIHOJI_FORCE_BUILD_ERROR`). C'est ce qui permet de tester la boucle d'autocorrection sans vrai bac à sable.

#### 2a.4 Boucle de génération (`lib/engine/run.ts`)

1. Créer une version `draft` à partir de la version courante.
2. Appeler le modèle (tâche `generate` ou `edit`) et appliquer les opérations.
3. Écrire les fichiers dans le bac à sable, puis lancer `npm install` (seulement si `package.json` a changé) et `npm run build`.
4. Si le build réussit : la version passe en `built` et l'onglet Preview charge `previewUrl`.
5. Si le build échoue :
   - extraire les erreurs pertinentes (fichier, ligne, message ; tronquer à 4 000 caractères) ;
   - appeler le modèle avec la tâche `fix` ;
   - appliquer, puis relancer le build.
6. Maximum 3 tentatives d'autocorrection. Après 3 échecs :
   - la version passe en `failed` ;
   - le chat affiche les erreurs en langage clair, avec deux boutons : « Restore previous version » et « Try a different approach ».
7. Chaque étape émet un événement vers le client via un flux SSE (`/api/generate`) : `planning`, `editing`, `installing`, `building`, `fixing (n/3)`, `ready`, `failed`. Le chat affiche ces étapes sous forme de liste de progression.
8. Le bouton « stop » du compositeur annule la boucle (`AbortController`) et laisse la version en `draft`, que l'utilisateur peut rejeter.

La boucle ne dépend que de l'interface `SandboxProvider`, jamais d'une implémentation précise.

#### 2a.5 Onglet Code

L'onglet affiche :
- l'arborescence réelle de `project_files` ;
- un éditeur en lecture seule par défaut (CodeMirror ou Monaco, selon ce qui est le plus léger) ;
- un mode d'édition manuelle qui crée une version `createdBy: "user"` à l'enregistrement.

#### Critères de sortie du lot 2a
- Une demande crée bien une version.
- Les opérations `create` / `edit` / `delete` s'appliquent correctement aux fichiers.
- Une opération `edit` ambiguë est rejetée puis corrigée.
- Une erreur forcée via le marqueur déclenche l'autocorrection, et la version finit en `built` ou en `failed` après 3 tentatives.
- Le chat affiche les étapes de progression.
- L'onglet Code montre les vrais fichiers.
- Build, lint et tests verts.

### Lot 2b : branchement du vrai bac à sable

Ne commence ce sous-lot qu'une fois le lot 2a validé.

**Implémentation `lib/sandbox/e2b.ts`**
- Sandbox E2B, clé `E2B_API_KEY`.
- Si tu envisages les WebContainers de StackBlitz, n'en fais pas l'implémentation par défaut, et note que leur usage commercial demande une licence à vérifier.

**Règles d'exécution**
- Le bac à sable n'a accès à aucune variable d'environnement de Mihoji.
- Délai maximal de 120 s par commande.
- Destruction après 15 minutes d'inactivité.
- Un seul bac à sable actif par projet et par utilisateur.

**Sélection automatique**
`lib/sandbox/index.ts` choisit E2B si `E2B_API_KEY` est présente, sinon le bac à sable simulé en dev. En production, une clé absente renvoie une erreur explicite.

**Vérification de bout en bout**
- La boucle 2a.4 fonctionne avec un vrai `npm run build` et une vraie autocorrection.
- L'aperçu s'affiche depuis l'URL réelle du bac à sable.

**En cas de blocage** (compte E2B, quota, incompatibilité réseau dans Codespaces) :
- ne modifie pas le lot 2a pour contourner le problème ;
- documente précisément le blocage dans `docs/phase-2-progress.md` ;
- explique-moi simplement comment créer le compte et où mettre la clé ;
- passe au lot 3, qui ne dépend que du lot 2a.

---

## Lot 3 : crédits prévisibles

Ce lot est le principal différenciateur commercial de Mihoji : l'utilisateur ne paie pas les erreurs de l'IA.

**Grand livre des crédits**
- Remplace les débits directs par une table `credit_ledger` : `id`, `workspaceId`, `projectId`, `versionId`, `task`, `model`, `promptTokens`, `completionTokens`, `amount`, `shadowCost`, `reason`, `createdAt`.
- `getCreditBalance` (`lib/billing/queries.ts`) devient la somme du grand livre sur la période.
- La règle de source unique reste inchangée : le compositeur Studio et la page Billing lisent tous deux `getCreditBalance`.

**Estimation avant exécution (`lib/ai/estimate.ts`)**
- Avant chaque génération, estime une fourchette basse/haute de crédits à partir :
  - de la taille du contexte envoyé ;
  - du type de tâche ;
  - d'une moyenne glissante des générations précédentes du même projet.
- Affiche-la sous le compositeur pendant la saisie (debounce 500 ms), par exemple « ≈ 8–15k credits ».
- Si la borne haute dépasse `confirmAboveCredits` (défaut 50 000, réglable dans Preferences), demande une confirmation avant l'envoi.

**Corrections gratuites**
- Les crédits consommés par les tâches `fix` de la boucle d'autocorrection ne sont PAS débités.
- Ils sont enregistrés dans `credit_ledger` avec `reason: "auto_fix_free"`, `amount: 0` et le coût réel dans `shadowCost`.
- Un bouton « This broke my app » sur chaque message de l'agent rend gratuite la génération `fix` suivante sur ce projet. Limite : 3 par jour et par espace, anti-abus.

**Mode plan**
- Ajoute au compositeur une bascule « Plan / Build ».
- En mode Plan, l'agent discute et propose une approche sans modifier de fichier.
- Ce mode utilise le modèle rapide. Il est gratuit dans la limite de 20 messages par jour, puis facturé au tarif de la tâche `chat`.

**Plafond par requête**
- Dans Preferences, un champ « Max credits per request » (vide = pas de plafond).
- La boucle s'arrête proprement si le plafond est atteint, en conservant le travail déjà fait dans une version `draft`.

**Affichage**
La page Usage affiche une nouvelle ligne « Free fixes » avec le total offert sur le mois.

---

## Lot 4 : audit de sécurité avant publication

**Le module (`lib/security/audit.ts`)**
- Il prend la version à publier et renvoie une liste de problèmes `{ severity: "critical" | "warning" | "info", rule, file, line, message, fixHint }`.
- Il est lancé automatiquement au clic sur Publish, et à la demande depuis une section « Security » dans Settings du projet.

**Règles minimales (une règle = un fichier testé dans `lib/security/rules/`)**
1. **Secret exposé côté client** : motifs `sk-`, `pk_live`, `AKIA`, `eyJ…` ou variables `NEXT_PUBLIC_*` contenant un secret, dans du code envoyé au navigateur.
2. **Route API sans contrôle d'authentification** alors qu'elle lit ou écrit des données utilisateur.
3. **Accès aux données sans filtrage par utilisateur** : requête sur une table qui contient `userId` ou `ownerId` sans condition sur l'utilisateur courant.
4. **Fichier `.env` ou identifiants en dur** dans le projet généré.
5. **Dépendances vulnérables** : `npm audit --json` exécuté dans le bac à sable ; niveaux `high` et `critical` uniquement. Si le lot 2b est bloqué, cette règle est marquée « skipped » dans le rapport, avec la raison.
6. **Formulaires sans validation côté serveur** (avertissement).

**Effet sur la publication**
- Tout problème `critical` bloque la publication.
- La modale de publication liste les problèmes avec un bouton « Fix with AI » qui lance une tâche `fix` ciblée. Cette correction est gratuite, comme au lot 3.
- Les `warning` restent visibles mais n'empêchent pas la publication.

---

## Lot 5 : points de restauration et protection des données

**Historique des versions**
- L'icône d'historique de l'en-tête Studio ouvre un panneau latéral listant les `project_versions` : résumé, auteur (agent ou utilisateur), date, statut.
- Actions disponibles : « Preview this version » et « Restore ».
- Restaurer crée une NOUVELLE version identique à l'ancienne ; rien n'est jamais écrasé ni supprimé.

**Séparation test / production**
- Chaque projet a deux bases de données logiques : `test` (aperçu et agent) et `production` (site publié).
- L'agent ne peut exécuter aucune opération destructive (`DROP`, `TRUNCATE`, `DELETE` sans `WHERE`, migration supprimant une colonne) sur la base de production.
- Toute migration vers la production passe par une confirmation explicite de l'utilisateur, qui affiche le SQL et les tables touchées.
- La pastille « Testing » de l'en-tête Studio indique clairement l'environnement actif.

**Sauvegarde**
Une sauvegarde automatique de la base de production est prise avant chaque publication contenant une migration. Elle est restaurable depuis le panneau d'historique.

---

## Lot 6 : SEO par défaut

**Le gabarit de base** (`templates/base/`, lot 2a.1) inclut d'office :
- rendu serveur des pages de contenu (pas de rendu client seul pour le texte indexable) ;
- `metadata` Next.js par page ;
- `sitemap.ts` et `robots.ts` ;
- balises Open Graph ;
- données structurées JSON-LD de base (`Organization`, `WebSite`).

**Audit SEO après chaque build réussi (`lib/seo/audit.ts`)**
Il vérifie :
- titre et description présents, avec une longueur raisonnable ;
- un seul `h1` par page ;
- attributs `alt` sur les images ;
- liens internes cassés ;
- pages bloquées par erreur dans `robots`.

Les résultats s'affichent dans l'onglet SEO existant, avec « Fix with AI » sur chaque point.

---

## Critères d'acceptation globaux

**Base et connexion**
- Sans clé Supabase, l'app fonctionne en mode démo avec un bandeau « Demo mode ».
- Avec les clés, connexion par lien magique et données persistantes.

**Modèles**
- Plus aucune référence à `llama-3.3-70b-versatile` ni à `GROQ_MODEL` dans le dépôt.
- Un modèle configuré absent de `/models` déclenche la bascule sur le modèle de secours.

**Génération**
- Une demande « Create a landing page with a contact form » sur un projet neuf produit une version `built` avec un aperçu fonctionnel. C'est attendu avec le bac à sable simulé ; avec le vrai bac à sable aussi, si le lot 2b est livré.
- Une erreur de build est corrigée automatiquement en 3 tentatives maximum, sans débit de crédits pour les corrections.

**Crédits**
- L'estimation s'affiche avant l'envoi.
- Le plafond par requête arrête proprement la boucle.
- Le compositeur et la page Billing affichent toujours le même solde, calculé depuis `credit_ledger`.

**Sécurité**
Une clé `sk-…` placée dans un composant client bloque la publication avec un message clair.

**Restauration et données**
- Restaurer une ancienne version crée une nouvelle version et ne supprime rien.
- L'agent ne peut pas exécuter d'opération destructive sur la base de production.

**Build**
`npm run build`, `npm run lint` et `npx vitest run` passent.

Termine par une mise à jour finale de `docs/phase-2-progress.md` listant :
- ce qui est réel ;
- ce qui est simulé ;
- les blocages rencontrés ;
- les clés à fournir (Supabase, `GROQ_API_KEY`, `E2B_API_KEY`).