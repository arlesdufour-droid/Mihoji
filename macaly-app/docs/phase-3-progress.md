# Avancement de la phase 3

## Lot 1 — terminé

- **Réel :** interface et métadonnées françaises, prompt système français, navigation du Studio traduite, mode simple/expert, écran de choix `Mon entreprise` ou `Mes clients`, champ `users.ui_mode` et champ `workspaces.kind`.
- **Simulé :** la sélection d’espace et la bascule de mode sont conservées dans le navigateur pour la démo ; la persistance serveur sera raccordée au parcours d’authentification.
- **Vérifié :** `npm run i18n:check`, `npm run lint`, `npx vitest run` et `npm run build` passent.

## Reste à faire

- Relier le choix d’espace et le mode d’interface à la session et aux mutations Supabase.
- Implémenter les lots 2 à 7 : SIRET, modèles métier, conformité, porte Pro, tarification et support.
- Compléter la traduction des contenus métier, des emails et des documents générés avant lancement public.

## Correctif du parcours SIRET — en cours du lot 2

- **Réel :** « Mon entreprise » mène maintenant vers `/onboarding/siret`, puis vers la confirmation et les champs manquants.
- **Simulé :** la recherche d’entreprise utilise encore des données de démonstration ; les informations sont conservées dans le navigateur.
- **Démo :** « Réinitialiser la démo » supprime l’espace et l’entreprise simulés et renvoie vers l’écran de choix.
- **À compléter :** brancher la recherche à l’API publique Recherche d’entreprises et persister les données dans Supabase.
