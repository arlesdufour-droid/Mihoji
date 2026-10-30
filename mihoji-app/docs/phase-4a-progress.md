# Progression phase 4a

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
- Liste des comptes, espaces, soldes, publications, signalements, support et `shadowCost`.
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
