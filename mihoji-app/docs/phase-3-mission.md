# Mission phase 3 : deux portes d'entrée, « Entreprises » et « Pro »

Ce document est stocké dans `docs/phase-3-mission.md`. C'est ta référence pour toute la phase 3 : relis-le au début de chaque lot. Les règles générales de `AGENTS.md` restent valables :
- lot par lot, un commit Git par lot ;
- `npm run build`, `npm run lint` et `npx vitest run` doivent passer ;
- interfaces avec version simulée ;
- aucun secret côté client ;
- résumé simple en français à la fin de chaque lot.

Livre les lots dans l'ordre 1 → 2 → 3 → 4 → 5 → 6 → 7, avec un commit par lot (message : « Phase 3 – Lot X : … »), et tiens à jour `docs/phase-3-progress.md`.

## Positionnement

Mihoji devient la plateforme française pour créer des sites et outils web d'entreprise, conformes dès la sortie. Un seul produit, un seul moteur, deux portes d'entrée :

| | Porte « Entreprises » | Porte « Pro » |
|---|---|---|
| Public | TPE, artisans, commerçants, indépendants, professions libérales | Agences web, freelances, intégrateurs qui créent des sites pour des TPE |
| Promesse | « Le site de votre entreprise, conforme et en ligne en 10 minutes. » | « Livrez des sites conformes à vos clients en une heure, sous votre marque. » |
| Interface | Mode simple par défaut | Mode expert par défaut |
| Page d'accueil | `/` | `/pro` |

**Règle absolue :** aucune fonction n'est dupliquée. Les deux portes utilisent le même moteur de génération, les mêmes modèles métier et le même module de conformité. Seuls l'accueil, l'interface et la tarification diffèrent.

**Vocabulaire :**
- Porte Entreprises : aucun terme technique visible (« vibe coding », « deploy », « full-stack », « repository » interdits). On dit « Mettre en ligne », « Mon site », « Mes informations ».
- Porte Pro : le vocabulaire technique est autorisé, en français (« Mettre en production », « Base de données », « Code »).

---

## Lot 1 : tout le site en français, type d'espace, mode simple / expert

**Langue : tout le site est en français**
- Le français est la langue par défaut et la langue de référence de Mihoji, pour les DEUX portes (Entreprises et Pro), sans exception.
- Sont concernés :
  - toutes les pages publiques (`/`, `/pro`, tarifs, centre d'aide) ;
  - toute l'application (Studio, réglages, facturation, utilisation, menu compte) ;
  - les emails (connexion, factures, notifications) ;
  - les messages d'erreur et de confirmation ;
  - les étapes de progression de la génération ;
  - les documents générés.
- Traduis tous les libellés ajoutés en anglais pendant les phases 1 et 2, par exemple :

| Anglais | Français |
|---|---|
| « Restore previous version » | « Restaurer la version précédente » |
| « Try a different approach » | « Essayer autrement » |
| « This broke my app » | « Ça a cassé mon site » |
| « Plan / Build » | « Réfléchir / Construire » |
| « Free fixes » | « Corrections offertes » |
| « Fix with AI » | « Corriger avec l'IA » |
| « Credits remaining » | « Crédits restants » |
| « Add credits » | « Acheter des crédits » |
| « Publish » | « Mettre en ligne » |
| « Share » | « Partager » |

- Le prompt système de l'agent demande des réponses en français et génère par défaut des sites en français.
- L'anglais reste disponible en option dans Préférences, mais n'est jamais affiché par défaut.
- Vérification : un script `npm run i18n:check` liste toute chaîne visible en dur hors de `messages/` et toute clé présente en anglais mais absente de `messages/fr.ts`. Il doit renvoyer zéro résultat.
- Formats français partout :
  - nombres « 136,4 k » ;
  - dates « 28 novembre 2026 à 22 h 41 » ;
  - montants affichés HT avec mention TTC : « 9 € HT/mois (10,80 € TTC) ».

**Type d'espace**
- Ajoute à la table `workspaces` un champ `kind` : `business` | `agency`.
- À l'inscription, un écran unique pose la question « Vous créez un site pour… », avec deux grandes cartes :
  - « Mon entreprise » → `business` ;
  - « Mes clients (agence, freelance) » → `agency`.
- Le type peut être changé plus tard dans Réglages › Général.

**Mode simple / mode expert**
- Préférence par utilisateur `uiMode` : `simple` | `expert`. Défaut : `simple` pour `business`, `expert` pour `agency`. Bascule disponible dans le menu compte et dans Préférences.
- **Mode simple :**
  - le Studio n'affiche que le chat, l'aperçu et un bouton « Mettre en ligne » ;
  - les onglets Code, Base de données, Statistiques, SEO et Paiements sont masqués ;
  - les réglages deviennent un panneau « Mon site » avec des sections en langage clair : Mes informations, Mes horaires, Mes services, Mes coordonnées, Mon domaine, Conformité.
- **Mode expert :** le Studio actuel, entièrement traduit en français.

---

## Lot 2 : démarrage par le SIRET

**Service `lib/company/lookup.ts`**
- Utilise l'API publique Recherche d'entreprises (`https://recherche-entreprises.api.gouv.fr/search?q=…`), sans clé. Accepte un SIREN (9 chiffres) ou un SIRET (14 chiffres), après contrôle de format et de clé de Luhn.
- Récupère :
  - dénomination ;
  - forme juridique ;
  - adresse du siège ;
  - code NAF et libellé ;
  - date de création ;
  - dirigeants, si publics ;
  - état administratif (refuser poliment une entreprise cessée).
- Calcule le numéro de TVA intracommunautaire à partir du SIREN : clé = (12 + 3 × (SIREN mod 97)) mod 97, numéro = « FR » + clé sur 2 chiffres + SIREN.
- Cache de 24 h et implémentation simulée pour les tests.
- Gère proprement les limites de débit de l'API (nouvelle tentative avec délai, puis message clair).

**Parcours**
- Après le choix « Mon entreprise » : un champ « Votre numéro SIRET » et un lien « Je n'ai pas encore de SIRET » (saisie manuelle).
- Écran de confirmation avec les informations trouvées, toutes modifiables.
- **Champs que l'API ne fournit pas, demandés ensuite :** capital social, numéro RCS ou RM, directeur de la publication, email et téléphone de contact.
- Les informations sont stockées dans une table `companies` liée au projet, et réutilisées partout (pied de page, mentions légales, contact, données structurées).

**Porte Pro**
L'agence saisit le SIRET de son client au moment de créer un projet client (lot 5).

---

## Lot 3 : modèles par métier

**Correspondance NAF → famille (`lib/templates/naf-map.ts`)**
Quatre familles pour commencer :

| Famille | Exemples d'activités | Sections et fonctions du modèle |
|---|---|---|
| Artisans et BTP | plomberie, électricité, maçonnerie, menuiserie | Demande de devis (formulaire détaillé), zone d'intervention, réalisations en photos, certifications (RGE, Qualibat), avis clients |
| Restauration et commerce | restaurant, boulangerie, boutique | Menu ou catalogue, horaires, réservation ou click & collect, plan d'accès, avis clients |
| Santé, bien-être, professions libérales | kiné, ostéopathe, coiffure, avocat, comptable | Prestations et tarifs, prise de rendez-vous, présentation du praticien, accès |
| Conseil, coaching, formation | consultant, coach, formateur | Offre, références, prise de contact, paiement en ligne |

**Fonctionnement**
- Chaque modèle est un gabarit dans `templates/<famille>/`, construit sur `templates/base/` de la phase 2 (SEO inclus), avec des textes en français.
- Le prompt système reçoit la famille, les données de l'entreprise et la description saisie par l'utilisateur pour personnaliser le contenu.
- Une activité non reconnue utilise un modèle générique « Entreprise ».
- L'utilisateur peut toujours changer de famille.

---

## Lot 4 : module de conformité française

Un module `lib/compliance/` génère et maintient automatiquement :

1. **Mentions légales** à partir de `companies` :
   - dénomination, forme juridique, capital, siège, RCS/RM, SIREN, TVA ;
   - directeur de la publication ;
   - coordonnées de l'hébergeur (celles de l'hébergement Mihoji, configurables dans `lib/compliance/host.ts`).

   S'il manque un champ obligatoire, la page affiche un rappel à l'utilisateur, jamais un champ vide sur le site publié.

2. **Bandeau cookies** conforme aux recommandations de la CNIL :
   - boutons « Tout accepter » et « Tout refuser » de même taille et même visibilité ;
   - lien « Personnaliser » ;
   - aucun traceur non essentiel avant consentement ;
   - choix mémorisé 6 mois.

   Le bandeau n'apparaît que si le site utilise réellement des traceurs non essentiels (détection dans le code généré).

3. **Politique de confidentialité RGPD**, générée selon les formulaires et services réellement présents : contact, devis, rendez-vous, newsletter, paiement. Elle précise les finalités, durées de conservation et droits, et le contact pour les exercer.

4. **CGV**, uniquement si le site vend en ligne, avec :
   - droit de rétractation de 14 jours pour la vente à distance aux particuliers, et ses exceptions ;
   - médiateur de la consommation, champ à renseigner par l'utilisateur.

**Écran « Conformité » (mode simple et mode expert)**
- Une liste de contrôle avec un statut vert / orange / rouge par élément.
- Bouton « Corriger » sur chaque point.
- Ces vérifications s'ajoutent à l'audit de publication de la phase 2. Un point rouge sur les mentions légales bloque la mise en ligne.

**Avertissement obligatoire, sur chaque document généré et sur l'écran Conformité :**
> « Ces documents sont des modèles générés automatiquement à partir de vos informations. Ils ne remplacent pas un conseil juridique ; vérifiez-les ou faites-les relire par un professionnel. »

---

## Lot 5 : fonctions de la porte Pro

Ces fonctions ne sont visibles que dans un espace `agency`.

**Espaces clients**
- Une agence crée des « projets clients ». Chacun a son entreprise (SIRET), ses fichiers, son domaine et sa conformité.
- Tableau de bord `/pro/clients` : liste des clients, statut de mise en ligne, état de conformité, consommation de crédits par client, et création d'un nouveau client par SIRET.

**Marque blanche**
- Dans Réglages › Marque : logo, couleur principale, nom de l'agence et domaine personnalisé de l'interface (`studio.agence-dupont.fr`).
- Quand un client de l'agence se connecte (accès client, voir plus bas), il voit la marque de l'agence et non celle de Mihoji, sauf une mention discrète « Propulsé par Mihoji » que la formule la plus chère permet de retirer.

**Accès client**
- L'agence peut inviter son client sur son projet, en mode simple.
- Rôles possibles :
  - « Lecture seule » ;
  - « Modifier le contenu » (textes, images, horaires) ;
  - « Complet ».

**Transfert de propriété**
- Bouton « Transférer ce site au client ». Le projet est déplacé vers un espace `business` au nom du client (créé si nécessaire).
- Le transfert exige une confirmation des deux parties. L'historique des versions est conservé.

**Suivi par client**
- Export CSV mensuel de la consommation par client, pour que l'agence puisse refacturer.

---

## Lot 6 : tarification et pages d'accueil

**Formules (`lib/plans.ts`)**
- Formules Entreprises : inchangées (Free, Starter, Pro, Max), affichées HT avec mention TTC.
- Formules Pro, en ajout (valeurs de départ, modifiables) :

| Formule | Prix HT/mois | Projets clients | Crédits/mois | Marque blanche |
|---|---|---|---|---|
| Freelance | 49 € | 5 | 10M | logo et couleur |
| Agence | 149 € | 25 | 40M | complète, avec domaine personnalisé |
| Agence+ | 299 € | illimité | 100M | complète, avec retrait de « Propulsé par Mihoji » |

- La page Facturation affiche les formules correspondant au type d'espace.

**Pages d'accueil publiques (en français)**

`/` (Entreprises), dans l'ordre :
1. Promesse, avec un champ SIRET directement dans l'en-tête (« Essayez avec votre SIRET »).
2. Trois étapes : SIRET → description → mise en ligne.
3. Les quatre familles de métiers, avec un exemple de site pour chacune.
4. Bloc « Conforme dès la mise en ligne » : mentions légales, RGPD, cookies, hébergement en Europe.
5. Tarifs.
6. Questions fréquentes.
7. Lien discret « Vous êtes une agence ? » vers `/pro`.

`/pro` (agences et freelances), dans l'ordre :
1. Promesse.
2. Gain de temps chiffré (une fourchette, présentée comme une estimation).
3. Démonstration du tableau de bord clients.
4. Marque blanche et transfert au client.
5. Tarifs Pro.
6. Questions fréquentes.

Les deux pages suivent le design system existant et sont rendues côté serveur (SEO).

---

## Lot 7 : support en libre-service

**Centre d'aide `/aide`**
- Articles en markdown dans `content/help/`, rédigés en français simple.
- Une vingtaine d'articles de départ couvrant les questions prévisibles :
  - SIRET introuvable ;
  - brancher un nom de domaine ;
  - modifier les horaires ;
  - comprendre les crédits ;
  - résilier ;
  - transférer un site à un client.

**Assistant d'aide**
- Une bulle « Besoin d'aide ? » dans l'application.
- Elle répond uniquement à partir des articles du centre d'aide (recherche dans `content/help/`, modèle rapide du routeur, réponses citant l'article source).
- Si l'assistant ne sait pas, il propose un formulaire de contact. Les demandes arrivent dans une table `support_tickets`, avec une notification email au propriétaire de Mihoji.

---

## Critères d'acceptation

**Langue**
- `npm run i18n:check` renvoie zéro résultat.
- Aucune chaîne anglaise n'est visible par défaut, sur aucune page, dans aucun email.

**Porte Entreprises**
- Une inscription « Mon entreprise » avec un SIRET réel actif produit, en mode simple :
  - un site du bon modèle métier, en français ;
  - des mentions légales complètes (hors champs demandés à l'utilisateur) ;
  - une conformité au vert après saisie de ces champs.
- Un SIRET d'entreprise cessée est refusé avec un message clair.

**Porte Pro**
- Une agence crée deux clients par SIRET, voit leur statut et leur consommation dans `/pro/clients`, et transfère l'un d'eux à son client.
- Le client invité voit la marque de l'agence.

**Interface et documents**
- Aucun terme technique en mode simple.
- L'avertissement juridique est présent sur chaque document généré.

**Build**
`npm run build`, `npm run lint` et `npx vitest run` passent.

Termine par une mise à jour finale de `docs/phase-3-progress.md`, avec la liste de ce qui reste à faire avant un lancement public.