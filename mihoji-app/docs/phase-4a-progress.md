# Progression phase 4a

## Où on en est (1er novembre 2026)

### Ce qui fonctionne

- **Lots 0 à 8 terminés et poussés sur `main`**, avec migrations appliquées sur la base de développement (jusqu’à `0015`).
- **Parcours lot 0 corrigé et prouvé par 24 tests e2e Playwright** (`npm run test:e2e`) : redirection `/studio/demo`, chat en français simple sans code visible, historique du chat sur tous les onglets, panneau « Mon site », aperçu d’une ancienne version avec bandeau (heure de Paris), champs légaux complets, libellés NAF/juridiques, conformité qui ne réclame pas les champs remplis, publication bloquée avec les raisons exactes, compteur de sites distincts en ligne, nom d’espace lisible, factures en français, zéro erreur d’hydratation.
- **IA réelle (Groq) fonctionnelle** : protocole JSON `{ summary, operations }` avec `response_format: json_object`, 2 essais max seulement si nécessaire, réponse brute loggée en cas d’échec, aucun crédit débité si la génération échoue. Prouvé avec la vraie clé contre le serveur : « Nos spécialités avec 3 pains » et « titres en bleu foncé » sont réellement appliqués au site.
- **Consommation Groq réduite et mesurée** (offre gratuite : **8 000 tokens/minute et 1 000 requêtes/jour par modèle**, relevés dans les en-têtes `x-ratelimit-*` de l’API) : le chat n’envoie au modèle que les fichiers utiles à la demande (mots-clés, `index.html` toujours inclus, plafond 12 000 caractères au lieu de 20 000) et que les 10 derniers messages de l’historique, tronqués à 1 000 caractères (un historique long provoquait un 400 `invalid_request` affiché à tort comme « service IA indisponible »), les petites modifications passent par le modèle rapide `openai/gpt-oss-20b`, et un 429 respecte l’en-tête `retry-after` avant un unique second essai. Requête typique mesurée avec la vraie clé (`npx tsx scripts/smoke-ai-real.ts`, « Ajoute une section Témoignages avec 2 avis clients ») : **≈ 1 000 tokens au total** et 4 s de réponse, contre ≈ 6 000 tokens de seuls fichiers auparavant sur un site de 20 Ko.
- **Parcours Studio prouvé avec la vraie clé** : `npm run test:e2e:real` (`playwright.real.config.ts`, contre le serveur du port 3000, sans `AI_MOCK`) ouvre le Studio avec un historique de 35 messages, envoie « Ajoute une section Nos spécialités avec 3 pains » puis « Change la couleur des titres en bleu foncé » dans le chat, et vérifie que l’aperçu change réellement et que les réponses en mode simple ne contiennent aucun code (sanitisation renforcée : Markdown, CSS inline, blocs de code ; seule la réponse finale nettoyée est persistée).
- **Réglages › Mes informations** : la confirmation « Modifications enregistrées » reste affichée (erreur visible sinon) et l’aperçu du Studio se rafraîchit automatiquement, sans recharger la page (événement `mihoji-company-updated`).
- **Back-office `/admin` réel** : la page affiche utilisateurs, espaces et soldes de crédits, ajout manuel de crédits (tracé dans `credit_ledger`), coût IA estimé par espace (`shadowCost`), sites publiés (un par projet, la dernière publication ; le compteur d’en-tête compte les lignes affichées) avec suspension de tout le projet, signalements et demandes de support. Couvert par le test e2e n° 22.
- **Données entreprise injectées depuis la base** (jetons `{{company.*}}`) : une modification dans « Mes informations » se répercute sur le site sans IA, y compris sur les projets existants (BOULANGERIE BRION migré, plus aucun code NAF ni coordonnée figée en base).
- **Tests e2e protégés** : `npm run test:e2e` refuse de démarrer si `APP_ENV=production` ou si `DATABASE_URL` n’est pas celle de la base de développement (`scripts/e2e-guard.ts`, règle 10 de `AGENTS.md`). Les utilisateurs de test (`e2e+…@mihoji.test`) et toutes leurs données sont supprimés par le teardown Playwright ; les 49 utilisateurs de test hérités des anciens formats ont été nettoyés.
- **Limite Groq (429) claire pour l’utilisateur** : l’API renvoie `ai_rate_limited` et le chat affiche « L’assistant est très sollicité, réessayez dans une minute. ».

### Ce qui reste cassé ou à surveiller

- **Limite Groq (429 `rate_limit_exceeded`)** : la cause des échecs « service IA indisponible » était la limite du compte Groq (8 000 tokens/minute en offre gratuite ; une requête chat envoyait jusqu’à ≈ 6 000 tokens de fichiers, donc 2 requêtes dans la minute suffisaient à déclencher le 429). La consommation est désormais ≈ 1 000 tokens par requête et `retry-after` est respecté ; si le message réapparaît, c’est la limite du compte — vérifier la console Groq et les logs serveur (la cause y est écrite explicitement).
- **IA simulée dans la suite e2e principale** : `npm run test:e2e` utilise le mock (déterministe, sans crédits) via `AI_MOCK=1` ; la vraie clé est validée par `npm run test:e2e:real` (parcours interface complet) et `scripts/smoke-ai-real.ts`.
- **Configuration de production non faite** (volontairement reportée en fin de phase) : Vercel, second projet Supabase, domaines, Stripe, Brevo, Sentry, Google OAuth, E2B — voir la liste ordonnée en bas de ce fichier.

### Prochaine étape

Reprendre la mission `docs/phase-4a-mission.md` au **lot suivant non couvert par les correctifs** (les lots 0 à 8 sont livrés ; vérifier avec un test utilisateur réel que l’IA réelle tient dans la durée, puis lancer la configuration de production quand vous serez prêt).

## Lot 0 — terminé

### Réel

- Accès projet validé par UUID et 404 propre ; `/studio/demo` redirige vers le dernier projet ou l’onboarding.
- Données de compte, espace et factures sans fausses factures ; libellés juridiques et NAF ajoutés avec tests.
- Champs de conformité supplémentaires ajoutés à l’onboarding.
- Historique du chat persisté dans `chat_messages`, rechargé après navigation ; historique des versions restaurable par nouvelle version.
- Erreur de prérendu Next 16 traitée avec `connection()` et `instant = false`.

### Simulé ou restant

- Le mode sans `DATABASE_URL` reste une simulation locale, sans persistance par définition.
- La publication réelle et ses contrôles de conformité sont livrés aux lots 3 et suivants.
- Les données d’usage détaillées restent simulées jusqu’à leur branchement à des tables métier.

### À faire côté utilisateur

- Appliquer la migration `db/migrations/0008_phase_4a_lot_0.sql` sur chaque base Supabase.
- Tester le parcours avec un vrai SIRET et compléter les champs de mentions légales.

## Lot 1 — terminé

### Réel

- `APP_ENV` est documentée et un badge discret `development` est affiché hors production.
- Le script `npm run db:migrate` applique les migrations à la base indiquée par `DATABASE_URL` et mémorise son état.
- La procédure documente deux projets Supabase et une clé Groq distincte pour la production.

### Simulé ou restant

- Le second projet Supabase et la clé Groq de production ne sont pas créés automatiquement.

### À faire côté utilisateur

- Créer le second projet Supabase en région UE.
- Renseigner ses variables séparées avec `APP_ENV=production`, puis lancer `npm run db:migrate`.
- Créer une clé Groq de production distincte et renseigner `GROQ_API_KEY`.

## Lot 2 — terminé

### Réel

- Configuration Vercel ajoutée avec région Paris (`cdg1`).
- Redirection HTTP → HTTPS active en production dans le proxy.
- Procédure de création du compte, import GitHub, variables et domaine ajoutée au README.

### Simulé ou restant

- Le compte Vercel, le projet de production et le domaine restent à créer manuellement.

### À faire côté utilisateur

- Suivre la procédure « Déployer Mihoji sur Vercel » du README.
- Renseigner les variables Vercel avec les secrets du projet de production, notamment `NEXT_PUBLIC_SITE_URL`.

## Lot 3 — terminé

### Réel

- Publication isolée sur `PUBLISHED_SITES_DOMAIN`, avec simulation locale et fournisseur Vercel en production.
- Publication persistée dans `publications`, avec export des fichiers de la dernière version.
- Contrôle de conformité avant publication et bouton « Mettre en ligne » actif.
- En-têtes CSP, HSTS et X-Content-Type-Options envoyés au déploiement.
- Modèle `custom_domains` préparé sans branchement utilisateur.

### Simulé ou restant

- Sans `VERCEL_TOKEN`, la publication est simulée hors production.
- Le domaine racine et le projet Vercel de publication restent à configurer.

### À faire côté utilisateur

- Créer/configurer le projet Vercel de publication et renseigner `VERCEL_TOKEN`.
- Créer le domaine séparé, renseigner `PUBLISHED_SITES_DOMAIN`, puis appliquer les migrations.

## Lot 4 — terminé

### Réel

- `E2BSandboxProvider` utilise le SDK officiel `@e2b/code-interpreter`.
- Les fichiers sont écrits dans un bac à sable isolé, les commandes sont limitées à 120 secondes et le bac est détruit après exécution.
- Le délai d’inactivité maximal est fixé à 15 minutes.

### Simulé ou restant

- Sans `E2B_API_KEY`, le fournisseur simulé reste actif en développement.
- Aucun appel E2B réel n’a été possible ici car la clé n’est pas présente.

### À faire côté utilisateur

- Créer un compte sur [e2b.dev](https://e2b.dev), créer une clé API et renseigner `E2B_API_KEY` dans l’environnement de développement.
- Redémarrer le serveur puis relancer une génération pour vérifier une vraie URL d’aperçu.

## Lot 5 — terminé

### Réel

- Interface `Mailer` ajoutée avec implémentation Brevo et simulation locale.
- Textes français préparés pour bienvenue, mise en ligne et crédits faibles.
- Le bouton Google est affiché uniquement si `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.
- Documentation Supabase SMTP et Google Cloud ajoutée au README.

### Simulé ou restant

- Sans `BREVO_API_KEY`, les emails transactionnels sont journalisés sans envoi.
- Les emails d’authentification restent envoyés par Supabase après configuration SMTP.

### À faire côté utilisateur

- Créer/configurer Brevo et renseigner `BREVO_API_KEY`, `MAILER_FROM_EMAIL`, `MAILER_FROM_NAME`.
- Configurer SMTP Supabase.
- Configurer Google Cloud et Supabase, puis passer `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.

## Lot 6 — terminé

### Réel

- Sentry serveur et navigateur ajouté sans données personnelles (`sendDefaultPii=false`).
- Limite de fréquence persistante en base pour `/api/generate`.
- Refus de contenu explicite en français sans débit de crédits.
- Délais explicites ; seuls les tokens réellement reçus sont débités.
- Stratégie de sauvegarde production documentée.

### Simulé ou restant

- Sentry reste inactif tant que `SENTRY_DSN` n’est pas renseignée.
- La migration `0011_phase_4a_lot_6.sql` doit être appliquée à la base.

### À faire côté utilisateur

- Créer un projet Sentry et renseigner `SENTRY_DSN`.
- Appliquer la migration 0011.
- Activer les sauvegardes Supabase payantes ou l’export quotidien automatisé.

## Lot 7 — terminé

### Réel

- Analyse anti-abus avant publication : identifiants, données bancaires et imitation de marques.
- Les sites suspects sont bloqués et un signalement interne est créé.
- API publique de signalement et API authentifiée de suspension d’une publication.
- Limitation des demandes de lien magique par adresse IP.

### Simulé ou restant

- La page Vercel déjà déployée n’est pas remplacée dynamiquement par une page de suspension ; le statut est conservé en base et bloque les opérations Mihoji.

### À faire côté utilisateur

- Vérifier les règles anti-abus avec des exemples métier avant l’ouverture publique.

## Lot 8 — terminé

### Réel

- `/admin` et `/api/admin` réservés aux emails de `ADMIN_EMAILS`.
- La page `/admin` affiche réellement le back-office : comptes, espaces, soldes, publications, signalements, support et `shadowCost` (coût IA estimé par espace), avec formulaire d’ajout de crédits et bouton de suspension (test e2e n° 22).
- Ajout manuel de crédits journalisé dans `credit_ledger`, et suspension depuis le back-office.
- Export JSON des données de l’espace et suppression effective avec dépublication et suppression Supabase.
- Réglages avec boutons d’export et de suppression confirmée.

### Simulé ou restant

- L’envoi des demandes de support n’a pas encore d’interface publique ; les demandes existantes sont toutefois visibles dans le back-office.

### À faire côté utilisateur

- Renseigner `ADMIN_EMAILS` avec les adresses administratrices.
- Tester un export et une suppression sur un espace de test avant production.

## Fin de phase — configuration utilisateur ordonnée

1. **Supabase développement** — créer/maintenir le projet et renseigner `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
2. **Supabase production** — créer le second projet EU, activer les sauvegardes payantes et renseigner les mêmes variables avec les valeurs production lorsque le déploiement sera fait.
3. **Vercel** — créer le projet de déploiement, ajouter `VERCEL_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `PUBLISHED_SITES_DOMAIN` et `APP_ENV=production`.
4. **Groq** — créer les clés développement/production sur `console.groq.com`, puis renseigner `GROQ_API_KEY`, `AI_MODEL_FAST`, `AI_MODEL_STRONG`, `AI_MODEL_FALLBACK`.
5. **E2B** — créer la clé sur `e2b.dev` et renseigner `E2B_API_KEY`.
6. **Brevo** — créer la clé API et l’expéditeur vérifié sur `app.brevo.com`, puis renseigner `BREVO_API_KEY`, `MAILER_FROM_EMAIL`, `MAILER_FROM_NAME`.
7. **Sentry** — créer le projet sur `sentry.io`, puis renseigner `SENTRY_DSN` et `NEXT_PUBLIC_SENTRY_DSN`.
8. **Google OAuth** — configurer Google Cloud et Supabase Auth, puis renseigner `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.
9. **Stripe** — créer les prix et renseigner `STRIPE_PRICE_FREE`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_MAX`.
10. **Domaines DNS** — configurer `sites.mihoji.app` et les domaines clients dans Vercel ; ne pas modifier `.env.local` avant la bascule décidée.
