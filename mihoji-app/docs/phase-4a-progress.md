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
