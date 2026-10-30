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
