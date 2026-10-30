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

## Lots suivants

Les lots C à F restent à exécuter.
