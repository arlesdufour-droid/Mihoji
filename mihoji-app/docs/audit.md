# Audit du dépôt

Date : 29 octobre 2026
Périmètre : dépôt Git complet et application `macaly-app/`.
Méthode : inspection de l’arbre de travail, de l’historique Git (`--all`), des routes, composants, fournisseurs et tests. Aucun fichier applicatif n’a été modifié pendant l’audit.

## 1. Secrets et historique Git

### Résultat

- `.env.local` existe dans l’environnement de travail mais est ignoré ; il n’est pas suivi par Git.
- Aucun fichier `.env.local`, `.env.production`, secret, identifiant, token ou clé privée n’apparaît dans les chemins de l’historique Git inspecté.
- Le seul fichier d’environnement versionné est [`macaly-app/.env.example`](../.env.example), qui ne contient que des noms de variables vides.
- [`macaly-app/.gitignore`](../.gitignore) contient `.env*` et exclut donc `.env.local` et les autres variantes `.env.*`.
- La règle est confirmée par `git check-ignore -v`.
- Les recherches historiques des affectations `GROQ_API_KEY=`, `DATABASE_URL=`, `SUPABASE_SERVICE_ROLE_KEY=`, `E2B_API_KEY=` et `NEXT_PUBLIC_SUPABASE_ANON_KEY=` ne retournent aucun commit de valeur secrète.

### Attention

- Le dépôt contient des instructions et de la documentation qui mentionnent des noms de secrets et des chemins locaux ; ce ne sont pas des secrets.
- Le scan de secrets applicatif est une règle heuristique ([`src/lib/security/rules/secrets.ts`](../src/lib/security/rules/secrets.ts)) et ne remplace pas un scanner historique spécialisé.

## 2. Fonctions visibles mais non réelles

Les éléments ci-dessous affichent une action mais ne déclenchent pas de persistance, d’appel fournisseur ou de changement métier durable.

### Réglages

- **Connexions**, **Intégrations** et **Serveurs MCP** : les cartes Slack/Notion affichent `+ Connect`, sans `onClick`, route API ni stockage. Voir [`simple-settings-page.tsx`](../src/components/settings/simple-settings-page.tsx).
- **Membres** : `Send invite` n’a aucun gestionnaire ; l’adresse saisie n’est jamais envoyée.
- **Préférences** : les choix `Dark` et `Light` n’enregistrent rien ; les notifications navigateur sont une ligne d’interface sans bascule réelle.
- **Réglages généraux** : édition du nom, accès de l’espace et `Delete workspace` sont décoratifs.
- **Domaines** : la page est une façade générique sans ajout, vérification DNS ou liaison de domaine.
- **Aide** dans le menu compte : bouton sans action.

### Studio

- Barre d’aperçu : précédent, suivant, sélection de page, ouverture dans un nouvel onglet et plein écran n’ont pas d’action ; seul le rechargement incrémente réellement la clé de l’iframe et le bouton mobile ne change que son icône/état local. Voir [`preview-toolbar.tsx`](../src/components/studio/preview-toolbar.tsx).
- Barre de design : texte, style, commentaire et réduction des outils n’ont pas d’action ; `Modifier le design` ne change qu’un état visuel local. Voir [`edit-design-bar.tsx`](../src/components/studio/edit-design-bar.tsx).
- Le bouton `Mettre en ligne` change seulement un état local pendant 2,2 secondes ; aucune publication n’est créée. Le lien de partage est une URL codée en dur et sa copie est réelle côté navigateur, mais le site partagé n’est pas produit par cette action. Voir [`publish-actions.tsx`](../src/components/studio/publish-actions.tsx).
- Historique des versions, changement de projet et aide contextuelle du chat n’ont pas d’action métier.
- Les onglets Code, Base de données, Statistiques, SEO, Paiements et Réglages affichent actuellement un espace générique ; ils ne chargent pas de données de projet.

### Facturation et tarifs

- `Gérer`, `Acheter des crédits` et `Get started` n’ont pas de gestionnaire côté interface.
- Les routes checkout, portail et achat de crédits renvoient explicitement `stripe_not_configured` (503) : aucun paiement réel.
- Le sélecteur `For you / For your team` ne sert qu’à changer un état local ; la devise n’est pas utilisée pour recalculer les prix.
- La ligne comparative `Usage via ChatGPT & Claude` est une ligne statique, sans intégration ChatGPT/Claude ni métrique réelle.
- La page Factures affiche les données de démonstration et ne télécharge pas de facture malgré l’icône de téléchargement.

## 3. Réel, simulé et clés manquantes

| Domaine | Fonctionnement réel | Simulation ou stub | Clé/configuration manquante |
|---|---|---|---|
| Authentification | Supabase Auth SSR, lien magique et Google quand configuré | Mode démo automatique sinon ; session `demo-user` fixe | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Base de données | Schéma Drizzle/PostgreSQL et solde/abonnement quand `DATABASE_URL` existe | Factures, usage et plusieurs vues restent démo ; onboarding et projets métier utilisent `localStorage` | `DATABASE_URL`, migrations exécutées ; `SUPABASE_SERVICE_ROLE_KEY` est documentée mais non utilisée dans le flux audité |
| IA | Appels Groq, liste des modèles et streaming si la clé existe | `MockProvider` en développement sans clé ; réponse fixe ; route génération utilise surtout le chat et ne persiste pas les fichiers générés | `GROQ_API_KEY`, modèles optionnels `AI_MODEL_FAST`, `AI_MODEL_STRONG`, `AI_MODEL_FALLBACK` |
| Génération moteur | Validation Zod, opérations, hachage, boucle de corrections et événements sont réels et testés | La boucle n’est pas reliée au Studio visible ; projet d’onboarding et HTML métier sont générés localement | Fournisseur de persistance de projets/versions à brancher |
| Bac à sable | Sélection du fournisseur et erreurs de configuration sont réelles | `MockSandboxProvider` simule installation, build et URL ; `E2BSandboxProvider` est un stub qui lève une erreur | `E2B_API_KEY` et intégration SDK E2B approuvée |
| Publication | Aucun stockage ou déploiement observé | Bouton local et URL de partage fixe | Fournisseur de déploiement et persistance de publication à implémenter |
| Paiements | Routes d’erreur explicites et affichage des formules | Données de formule, solde, usage et factures de démo | Intégration Stripe et variables Stripe à définir |
| Entreprises/SIRET | Validation de format/Luhn et données de test locales | Recherche SIRET simulée, aucune API Recherche d’entreprises ni cache 24 h ; données dans `localStorage` | Aucun secret API requis pour l’API publique, mais client HTTP/cache à implémenter |
| Conformité | Affichage local d’informations et avertissement juridique | Pas de module `lib/compliance` complet, pas de documents persistés ni blocage de publication | Persistance `companies`, génération légale complète et hébergeur configurable |

Variables documentées dans [`macaly-app/.env.example`](../.env.example) : Supabase, PostgreSQL, Groq, modèles IA et E2B. Les variables Stripe ne sont pas encore documentées car les routes Stripe sont des stubs.

## 4. Occurrences de « Macaly » / « macaly »

Les occurrences trouvées hors dépendances et sorties générées sont :

| Emplacement | Occurrence |
|---|---|
| `macaly-app/` | Nom du dossier racine de l’application |
| [`package.json`](../package.json) | champ `name: "macaly-app"` |
| [`package-lock.json`](../package-lock.json) | nom du paquet racine à deux endroits |
| [`docs/phase-2-progress.md`](phase-2-progress.md) | deux chemins documentés `macaly-app/.env.local` |

Aucune occurrence de `Macaly` ou `macaly` n’a été trouvée dans le code source fonctionnel, les libellés de l’interface ou les textes de l’application. Le produit affiché reste `Mihoji`.

## 5. Cas particulier SIRET de La Poste

La validation est dans [`src/lib/company/lookup.ts`](../src/lib/company/lookup.ts) et applique actuellement le contrôle de Luhn sur 14 chiffres.

Vérifications effectuées :

- `35600000000048` est retourné par l’API officielle Recherche d’entreprises comme **LA POSTE**.
- `isValidSiret("35600000000048")` retourne `true`.
- Le cas officiel testé est donc accepté par l’interface actuelle.

Limite importante : le code ne documente ni ne traite explicitement l’exception historique du SIREN `356000000` ; il accepte cet établissement parce que le SIRET officiel testé passe le calcul appliqué. Il faut ajouter une règle métier dédiée et des tests de plusieurs établissements La Poste avant de considérer la couverture de l’exception comme complète.

## Décisions du lot E

- **(a) Réel :** partage/copie du lien et rechargement de l’aperçu.
- **(b) Masqué :** Connexions, Serveurs MCP, sélecteur de devise et comparaison « Usage via ChatGPT & Claude ».
- **(c) Bientôt disponible :** publication, achat de crédits, gestion de l’abonnement, invitations et suppression de l’espace.
- **(c) Bientôt disponible :** domaines, intégrations, aide contextuelle et actions de barre d’aperçu sans fournisseur métier.
- **(a) Préférences :** le choix Dark reste la préférence active ; Light est explicitement désactivé tant que son enregistrement n’est pas branché.

## Conclusion

Le dépôt est propre concernant les secrets versionnés, mais l’application reste majoritairement une démonstration : les parcours visibles de réglages, publication, domaines, invitations, paiements et bac à sable réel ne sont pas opérationnels. Les priorités avant lancement sont la persistance métier, l’intégration Recherche d’entreprises, la conformité complète, le déploiement réel, Stripe, E2B et le remplacement des actions décoratives par des erreurs ou états explicites.
