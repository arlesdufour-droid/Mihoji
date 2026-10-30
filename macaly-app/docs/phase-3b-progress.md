# Avancement de la phase 3b

## Lot A — terminé

- **Réel :** les tables `onboarding_states` et `companies` sont créées et la migration 0006 est appliquée à Supabase.
- **Réel :** l’onboarding, l’entreprise et la création initiale du projet passent par des routes serveur et la base.
- **Réel :** le Studio et les réglages récupèrent désormais les données du projet/entreprise depuis la base.
- **Réel :** le mode démo ne s’active que lorsque `DATABASE_URL` est absente.
- **Simulé :** la recherche SIRET utilise encore le fournisseur de démonstration ; elle sera remplacée au lot B.

### Comment vérifier

1. Ouvrir `/onboarding`.
2. Cliquer **Mon entreprise**.
3. Saisir un SIRET de démonstration valide et confirmer les informations.
4. Compléter les champs puis ouvrir le Studio.
5. Recharger la page et ouvrir le même projet dans un autre navigateur authentifié : les données viennent de la base.

## Lot B — terminé

- **Réel :** recherche via `recherche-entreprises.api.gouv.fr`.
- **Réel :** cache Supabase de 24 heures, refus des établissements cessés et gestion du HTTP 429.
- **Réel :** règle SIREN `356000000` et tests de validation.

### Comment vérifier

1. Ouvrir `/onboarding`.
2. Cliquer **Mon entreprise**.
3. Saisir un SIRET réel trouvé sur annuaire-entreprises.data.gouv.fr.
4. Vérifier que le nom, l’adresse et l’activité affichés correspondent à l’API publique.

## Lot C — terminé

- **Réel :** chaque message du Studio crée une version construite et persistée dans `project_versions`, avec le fichier `index.html` et son contenu dans `file_blobs`.
- **Réel :** une demande d’horaires applique une modification déterministe au fichier réel ; l’aperçu recharge ensuite la dernière version depuis la base.
- **Réel :** l’API liste les versions et permet de restaurer un instantané autorisé du projet.
- **Simulé :** le bac à sable d’exécution reste simulé tant qu’un fournisseur E2B n’est pas branché ; l’aperçu repose donc sur le rendu statique du fichier HTML enregistré.

### Comment vérifier

1. Ouvrir un projet dans `/studio/<projectId>`.
2. Demander dans le chat : **Ajoute une section Horaires avec lundi-vendredi 8h-18h**.
3. Vérifier que la section apparaît dans l’aperçu après la réponse.
4. Ouvrir l’onglet **Code** et vérifier le fichier HTML affiché.
5. Vérifier avec `GET /api/projects/<projectId>/versions` qu’une nouvelle version apparaît.
6. Restaurer une version avec `POST /api/projects/<projectId>/versions` et `{ "versionId": "..." }`, puis recharger le Studio.

## Lots suivants

Les lots D à F restent à exécuter.
