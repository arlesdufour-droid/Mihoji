# Mission phase 3b : consolidation — rendre réel ce qui existe

Ce document est stocké dans `docs/phase-3b-consolidation.md`. Relis-le au début de chaque lot. Base-toi sur `docs/audit.md` et `docs/phase-3c-progress.md`. La phase 3c est terminée : ne défais aucune de ses corrections (RLS, sessions via `workspace_members`, proxy, crédits, préparation Stripe, connexion par lien magique et `getPublicOrigin`).

Cette phase n'ajoute AUCUNE nouvelle fonction. Elle branche pour de vrai ce qui existe déjà et supprime les faux-semblants.

## Nouvelle règle permanente : à ajouter dans `AGENTS.md`

> **Définition de « terminé »**
> - Un lot n'est terminé que si chaque fonction livrée fonctionne réellement de bout en bout avec les clés présentes dans `.env.local`, ou si elle est explicitement listée comme simulée, avec sa raison, dans le fichier de progression.
> - Aucun bouton visible ne doit être sans action. Une fonction non disponible est soit masquée, soit affichée désactivée avec la mention « Bientôt disponible ».
> - Aucune donnée métier (entreprise, projet, onboarding, version) n'est stockée dans `localStorage`. `localStorage` est réservé aux préférences d'affichage.
> - Chaque résumé de fin de lot contient une section « Comment vérifier », avec les clics exacts à faire dans l'aperçu.

## Lot A : base de données réelle
- Vérifie que toutes les migrations sont appliquées.
- Remplace TOUT usage de `localStorage` pour les données métier par la base : onboarding (type d'espace, étape en cours), `companies`, `projects`, `project_files`, `project_versions`, `file_blobs`, `credit_ledger`.
- Factures, usage et solde lisent la base.
- Le mode démo ne s'active plus que si `DATABASE_URL` est absente.

**Comment vérifier :** je crée un projet, je recharge la page, j'ouvre un autre navigateur, et le projet est toujours là.

## Lot B : recherche SIRET réelle
- Remplace la recherche simulée par l'API publique Recherche d'entreprises (`https://recherche-entreprises.api.gouv.fr/search?q=…`), avec cache de 24 h en base, gestion des limites de débit et refus des entreprises cessées.
- Ajoute une règle explicite pour le SIREN `356000000` (La Poste, exception à l'algorithme de Luhn), avec des tests sur plusieurs établissements réels.
- Garde l'implémentation simulée uniquement pour les tests automatisés.

**Comment vérifier :** je saisis le SIRET d'un vrai commerce trouvé sur annuaire-entreprises.data.gouv.fr, et ses vraies informations s'affichent.

## Lot C : moteur relié au Studio
- Relie le chat du Studio à la boucle de génération (`lib/engine/run.ts`) : chaque message de construction crée une version, les opérations sont appliquées aux fichiers en base, et les étapes de progression s'affichent dans le chat.
- Supprime le mécanisme actuel qui remplace l'aperçu dès qu'une réponse contient `<div`.
- La fin de l'onboarding Entreprises crée un vrai projet en base à partir du modèle métier, lance la première génération avec les données de l'entreprise, et ouvre le Studio en mode simple avec le message d'accueil.
- L'onglet Code affiche les vrais fichiers du projet. Le panneau historique liste les vraies versions, et « Restaurer » fonctionne.
- L'aperçu affiche le résultat de la dernière version construite. Le bac à sable simulé reste accepté tant que E2B n'est pas branché, mais l'aperçu doit refléter le contenu réel des fichiers générés (par exemple via un rendu statique des pages générées).

**Comment vérifier :** je demande « Ajoute une section Horaires avec lundi-vendredi 8h-18h ». La section apparaît dans l'aperçu, le fichier modifié apparaît dans l'onglet Code, et une nouvelle version apparaît dans l'historique.

## Lot D : conformité complète
- Crée le module `lib/compliance/` complet, tel que décrit au lot 4 de `docs/phase-3-mission.md` : mentions légales, bandeau cookies CNIL, politique de confidentialité, CGV si vente en ligne, avertissement juridique.
- Les documents sont générés à partir des données réelles de `companies` et enregistrés comme fichiers du projet.
- L'écran Conformité reflète l'état réel. Un point rouge sur les mentions légales bloque « Mettre en ligne », avec un message clair.

**Comment vérifier :** je supprime le directeur de la publication, l'écran Conformité passe au rouge et la mise en ligne est bloquée. Je le remets, et tout repasse au vert.

## Lot E : suppression des faux-semblants
Pour chaque élément listé en section 2 de `docs/audit.md`, applique l'une de ces trois options :
- (a) le rendre réel s'il est simple et utile maintenant : boutons de la barre d'aperçu, changement de projet, thème clair/sombre enregistré, renommage de l'espace ;
- (b) le masquer : pages Connexions et Serveurs MCP, ligne « Usage via ChatGPT & Claude », sélecteur de devise ;
- (c) l'afficher désactivé avec « Bientôt disponible » : Mettre en ligne (le bouton lance les vérifications de conformité et de sécurité puis indique « Publication disponible prochainement »), Acheter des crédits, Gérer l'abonnement, invitations, domaines, suppression de l'espace.

Mets à jour `docs/audit.md` avec la décision prise (a, b ou c) pour chaque élément.

**Comment vérifier :** je clique sur tous les boutons de l'application, et chacun fait quelque chose de réel ou dit clairement qu'il n'est pas encore disponible.

## Lot F : renommage
- Le dossier de l’application est `mihoji-app`. Mets à jour `package.json`, `package-lock.json` (via `npm install`), la documentation et la configuration du Codespace si nécessaire.
- Vérifie que `npm run dev`, `npm run build` et les tests fonctionnent après le renommage.

## Fin de phase
Un commit par lot, push vers GitHub sur `main` à la fin, et mise à jour de `docs/phase-3b-progress.md` avec le tableau réel / simulé actualisé.