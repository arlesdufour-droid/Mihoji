# Progression mission Q — qualité des sites générés

## Lot 1 — bibliothèque de sections et thèmes — terminé

### Réel

- **Description structurée d’un site** (`src/lib/site/schema.ts`, zod) : thème (style + palette), SEO, un seul appel à l’action principal, pages et sections typées. Textes bruts uniquement (le rendu échappe tout), liens limités à `https:`, `#ancre`, `/chemin`, `tel:` et `mailto:`, images en `https:` ou chemin local. Les textes de remplissage (« Lorem ipsum », « Nom du service », « Service 1 », « Texte à venir »…) sont refusés par le schéma, ainsi qu’un `hero` hors première position, un pied de page hors dernière position ou une section unique en double.
- **15 types de sections, 2 ou 3 variantes chacun** : hero (photo, split, centré), présentation (image gauche/droite, texte), prestations (cartes, liste, icônes), produits/spécialités (grille, carte des prix, mise en avant), galerie (grille, mosaïque, défilement), avis (cartes, citation, liste), chiffres clés (bandeau, cartes), horaires (tableau, carte), zone d’intervention (pastilles, colonnes), FAQ (accordéon, colonnes), équipe (cartes, liste), appel à l’action (bandeau, carte, minimal), contact/devis (côte à côte, centré, coordonnées seules), plan d’accès (carte, côte à côte), pied de page légal (simple, colonnes). Navigation, menu mobile sans JavaScript et lien d’évitement inclus.
- **4 styles complets** (`src/lib/site/themes.ts`) : Artisan chaleureux (Fraunces + Nunito), Moderne épuré (Plus Jakarta Sans + Inter), Élégant premium (Cormorant + Inter), Dynamique coloré (Outfit + Inter). Chacun : 2 ou 3 palettes (11 au total), rayons, ombres, espacements, titres, style de boutons. **Contraste WCAG AA garanti par construction** : 14 paires texte/fond par palette vérifiées par test unitaire, puis mesurées dans le navigateur sur chaque exemple × chaque style × chaque palette.
- **CSS compilé, site statique léger** : aucun CDN ni script ; une feuille de style par site (19 à 21 Ko, ≈ 5 Ko compressée ; pages HTML de 11 à 17 Ko) qui n’inclut que les blocs des sections utilisées ; polices variables woff2 (sous-ensemble latin, 27 à 48 Ko, licence OFL) auto-hébergées dans `public/fonts/`, 2 familles au maximum par site, `font-display: swap`, préchargement ; images adaptatives (`srcset`, WebP) pour Unsplash, chargement différé, texte alternatif obligatoire, crédit photographe affiché.
- **Données entreprise toujours injectées** par `{{company.*}}` ; nouveau jeton `{{company.city}}` (ville déduite de l’adresse) ; les téléphone et email absents font disparaître leur ligne au lieu d’afficher un lien vide.
- **Galerie de contrôle `/admin/design`** (administrateurs) : 4 sites d’exemple (boulangerie, kiné, cabinet d’avocats, coach sportif), changement de style et de palette, catalogue des 15 types × variantes. Pages de rendu `/admin/design/render` (403 pour les non-admins).
- **Aperçu photo** : les exemples utilisent de vraies photos Unsplash récupérées par `scripts/fetch-photo-library.ts` (`UNSPLASH_ACCESS_KEY`), avec crédit. Sans photo, un visuel aux couleurs du thème s’affiche.
- Bonus : `scripts/gen-tailwind-palette.ts`, `scripts/gen-site-icons.ts` (44 icônes lucide statiques), analyse HTML qui ignore `<!doctype>`.

### Preuves

- Tests unitaires `src/lib/site/site.test.ts` : 15 types × variantes valides, 4 exemples valides, liens/images dangereux refusés, remplissage refusé, HTML bien formé pour chaque exemple et chaque catalogue, aucune dépendance externe, échappement, jetons, taille du CSS < 26 Ko.
- e2e `e2e/phase-q-lot-1.spec.ts` (Q1.1 à Q1.5) : galerie, accès admin, absence de débordement horizontal (ordinateur et mobile), polices chargées, aucun appel externe, **contraste mesuré dans le navigateur** pour 4 exemples × 4 styles × 11 palettes, et pour les 15 types × variantes × 4 styles à deux largeurs. Cet audit a détecté et fait corriger deux défauts : étoiles d’avis trop pâles et bouton illisible du menu mobile.
- Captures : `docs/screenshots/phase-q-lot1/` (`npm run design:screenshots`, serveur de développement sur le port 3000).

### Simulé ou restant

- La description n’est pas encore produite par un modèle (lot 2) ni éditée par le chat (lot 4) ; le Studio affiche toujours les anciens projets HTML. Le rendu est prêt à être branché (`renderSite(site, { inlineCss: true })` pour l’aperçu).
- Les polices sont servies par l’application (`/fonts/*`, CORS ouvert). La publication devra copier `public/fonts/*.woff2` avec le site (fichiers binaires, hors du stockage texte actuel) — à traiter avec le lot 4.
- Le formulaire de contact/devis est un vrai formulaire HTML qui ouvre la messagerie du visiteur (`mailto:`) ; un point de réception côté serveur reste à prévoir.
- Le plan d’accès est un lien OpenStreetMap (pas d’iframe, pour la légèreté et le RGPD).
- Photos : la sélection du meilleur résultat Unsplash, le déclenchement du téléchargement et le cache relèvent du lot 3 ; les requêtes de photos seront à demander en anglais (la recherche Unsplash y est bien plus pertinente).

### À faire côté utilisateur

- `ANTHROPIC_API_KEY`, `UNSPLASH_ACCESS_KEY` et `AI_MODEL_DESIGN` sont documentées dans `.env.example` (les deux clés sont déjà dans `.env.local`).
- Quota Unsplash en mode démonstration : 50 requêtes par heure ; l’application de production devra demander le passage en « Production » (5 000 requêtes par heure).

## Lot 2 — génération par un modèle de design — terminé

### Fait
- **Modules fonctionnels dans la description du site** (`src/lib/site/modules.ts`) : devis (`quote`), rendez-vous (`booking`), boutique / click & collect (`shop`), paiement en ligne (`payment`), newsletter, espace client (`clientArea`), widgets (Google Maps, avis Google, Calendly, WhatsApp, Instagram) et webhooks (événements). Contrôles de cohérence : un acompte exige le module paiement, le click & collect exige des horaires de retrait, un widget de chaque type, chaque module affichable a exactement une section `module` (16e type de section, variantes `panel` / `split`).
- **Rendu des modules** (`src/lib/site/module-sections.ts`) : contenu réel (prestations, durées, prix, créneaux, catalogue, offres) ; les actions pas encore actives sont des boutons désactivés « Bientôt disponible », avec en attendant le téléphone et l'email de l'entreprise. Le formulaire de devis reste un formulaire `mailto:`.
- **Fournisseur Anthropic** (`src/lib/ai/providers/anthropic.ts`, SDK officiel `@anthropic-ai/sdk`) derrière `LlmProvider` : modèle `AI_MODEL_DESIGN` (défaut `claude-sonnet-5-5`), prompt système mis en cache, repli serveur automatique en cas de refus (`fallbacks: "default"`). Routage (`designRoute`) : Anthropic → modèle fort Groq si la clé manque → simulation en développement, erreur explicite `ai_not_configured` en production. Les petites retouches (`edit`) restent sur le modèle rapide Groq.
- **Création et changement de style** (`src/lib/site/design.ts`, `design-prompt.ts`) : le modèle choisit style, palette, sections, ordre, modules et rédige les textes ; validation zod stricte, nouvel essai guidé par les erreurs (3 essais au maximum). Le changement de style ne choisit que le thème et les variantes, appliqués par le code : textes, sections et modules restent identiques.
- **Coût réel par génération** en euros (`shadowCostEur`, `src/lib/ai/pricing.ts`), enregistré dans la nouvelle table `site_generations` (migration `0016_phase_q_lot_2.sql`, appliquée sur la base de développement).
- **Laboratoire `/admin/design/generate`** (administrateurs) : formulaire avec 3 exemples cliquables, aperçu du site, coût, modèle, nombre d'essais, modules, changement de style, historique. Route `POST /api/admin/design/generate`.
- **Génération réelle** : `npm run design:generate` (base de développement uniquement). Résultats dans `docs/screenshots/phase-q-lot2/` (JSON, HTML, captures ordinateur et mobile, `resume.txt`) :
  - boulangerie avec click & collect : 1 essai, 23 s, **0,041 €**, style Artisan chaleureux, modules boutique + newsletter ;
  - coach avec rendez-vous et paiement : 1 essai, 23 s, **0,032 €**, style Dynamique coloré, modules rendez-vous (paiement à la réservation) + paiement (séance, forfait 10 séances) ;
  - plombier avec demande de devis : 1 essai, 19 s, **0,028 €**, style Moderne épuré, module devis (adresse, date, photos, bouton urgence).
  Objectif < 0,10 € par création atteint.

### Vérifié
- `npx vitest run` : 114 tests passent (nouveau `src/lib/site/design.test.ts`, routage dans `routing.test.ts`).
- `npm run lint` : OK.
- `npm run build` : OK (relancé sur la version finale, le 2 novembre 2026).
- e2e : suite complète passée (43 tests, dont `e2e/phase-q-lot-2.spec.ts` Q2.1 à Q2.3 et Q1.5 étendu au type `module`) ; Q2.3 légèrement modifié ensuite et repassé seul.

### Simulé ou restant
- Simulé : le fonctionnement des modules (réservation, commande, paiement, newsletter, espace client) — lots 7 et 8 ; widgets et webhooks seulement décrits, pas rendus.
- Photos : le modèle propose des requêtes (en anglais) mais les images ne sont pas encore récupérées (lot 3) ; les captures montrent des visuels aux couleurs du thème.
- Les générations du laboratoire ne débitent pas de crédits (outil d'administration) ; le branchement au Studio et à l'onboarding relève des lots 4 et 5.
- Repli Groq non testé en réel (limite de 8 000 jetons/min susceptible de bloquer une création complète).

### Résumé du lot

- **Ce qui marche** : à partir d'une demande et des données de l'entreprise, le modèle de design d'Anthropic crée un site complet en une vingtaine de secondes. Il choisit le style, la palette, les sections et les modules, puis rédige des textes propres au métier. Le coût réel est enregistré pour chaque création, entre 0,03 € et 0,04 € sur 3 essais réels. Le changement de style ne modifie que l'apparence du site.
- **Réel** : appel à Anthropic, validation et nouvel essai automatique, coût en euros, table `site_generations`, laboratoire d'administration.
- **Simulé** : le fonctionnement des modules (lots 7 et 8) et, en développement sans clé, la génération elle-même.
- **Reste en attente** : les photos (lot 3) et le branchement au Studio et à l'onboarding (lots 4 et 5).

### Comment vérifier

1. Dans l'aperçu, connectez-vous avec un compte administrateur, puis ouvrez `/admin/design`.
2. Cliquez sur « Générer un site avec l'IA » : la page `/admin/design/generate` s'ouvre.
3. Cliquez sur un des 3 exemples (boulangerie, coach ou plombier) : le formulaire se remplit.
4. Cliquez sur « Générer le site » et attendez environ 20 secondes. L'aperçu du site s'affiche avec le coût, le modèle, le nombre d'essais et les modules.
5. Dans le champ de changement de style, tapez par exemple « un style plus élégant, en bleu marine », puis cliquez sur « Changer le style ». Le style change, mais les textes et les sections restent les mêmes.
6. Les deux générations apparaissent dans le tableau « Dernières générations ».

Couvert par `e2e/phase-q-lot-2.spec.ts` (Q2.1 à Q2.3).

### À faire côté utilisateur

- Rien de bloquant : `ANTHROPIC_API_KEY` est déjà dans `.env.local`. Pour changer de modèle, renseignez `AI_MODEL_DESIGN` (documentée dans `.env.example`).


## Lot 3 — photos — terminé

### Fait
- **Fournisseur d'images derrière une interface** (`src/lib/photos/`) : `PhotoProvider` avec Unsplash (`UNSPLASH_ACCESS_KEY`) et une bibliothèque locale de 35 requêtes × 3 photos libres par métier (`library.json`, produite par `npm run … scripts/fetch-photo-library.ts`) en repli (clé absente, quota épuisé, panne, requête sans résultat). Pas de simulation en production : les photos locales sont de vraies photos libres.
- **Requêtes en anglais** : le prompt du modèle de design l'impose (3 à 6 mots, métier + geste visible, pas de pays ni de mot abstrait, une requête différente par image de galerie).
- **Meilleure photo selon le métier** (`select.ts`, pur, testé) : 20 résultats récupérés, chacun noté sur sa description, son texte alternatif et ses mots-clés (couverture de tous les mots de la requête) ; les motifs hors sujet (drapeau, affiche, parapluie, logo…) sont pénalisés. Le drapeau américain du cabinet d'avocats est remplacé par une photo de signature de contrat ; deux autres photos hors sujet des exemples (parapluie, ponton) ont aussi été remplacées.
- **Requêtes trop précises** : Unsplash exige tous les mots ; sans résultat, on réessaie avec les 3 puis 2 premiers mots (le métier d'abord). Une même photo n'est jamais utilisée deux fois dans un site (`assign.ts`).
- **Quota économisé** : cache en base `photo_cache` (migration `0017`, 30 jours, y compris les requêtes sans résultat) + cache mémoire ; une seule recherche par requête ; compteur horaire déduit de la base (budget 45 par heure, `UNSPLASH_HOURLY_BUDGET`) et lecture de `X-Ratelimit-Remaining` (réserve de 5). Simulation (mock) et tests : aucun appel Unsplash.
- **Règles d'Unsplash** : images servies depuis `images.unsplash.com` (tailles 480 à 1600, WebP, `srcset`, chargement différé), texte alternatif obligatoire en français, crédit photographe + lien Unsplash avec `utm_source=mihoji`, événement de téléchargement signalé quand la photo est utilisée.
- Branché dans `runDesignGeneration` : une panne de photos ne fait jamais échouer la création.

### Vérifié
- Génération réelle (plombier, Anthropic + Unsplash) : 6 images, 6 photos pertinentes (robinet, chaudière, tuyaux cuivre…), 0,036 €. La requête du hero, trop précise, a été résolue à la 2e tentative. Captures : `docs/screenshots/phase-q-lot3/`.
- `npx vitest run` : 124 tests (10 nouveaux dans `src/lib/photos/photos.test.ts`) ; `npm run lint` et `npm run build` : OK ; e2e lots 1, 2 et 3 (`e2e/phase-q-lot-3.spec.ts`, Q3.1 et Q3.2) : OK.

### Simulé ou restant
- Simulé : en simulation/tests, les photos viennent uniquement de la bibliothèque locale.
- Quota Unsplash démonstration (50/h) très limité : environ 6 à 10 recherches par site neuf. Le banc d'essai (lot 6) s'appuiera sur le cache ; passer l'application en « Production » Unsplash (5 000/h) avant le lancement.
- Faiblesses de la bibliothèque locale : pas de photo « plombier » ni « peintre » directement (seulement par recoupement de mots) ; quelques photos moyennes (« plank core workout », salle de bain bleue).
- Le script `fetch-sample-photos.ts` est remplacé par `fetch-photo-library.ts`.

### Comment vérifier
1. Connecté en administrateur, ouvrez `/admin/design`, choisissez l'exemple « cabinet d'avocats » : la photo d'en-tête montre une signature de contrat, plus de drapeau ; sous chaque photo, « Photo : nom · Unsplash ».
2. Ouvrez `/admin/design/generate`, cliquez « Plombier (demande de devis) » puis « Générer le site » : l'aperçu contient des photos avec crédit (en développement avec clé, ce sont de vraies recherches Unsplash).

Couvert par `e2e/phase-q-lot-3.spec.ts`.

### À faire côté utilisateur
- Demander le passage en « Production » de l'application Unsplash (5 000 requêtes/h) avant le banc d'essai de 10 sites.


## Lot 4 — modifications et migration — terminé

### Fait
- **Le chat modifie la description du site, jamais le HTML** : pour un projet au nouveau format (`site.json` + HTML rendu, enregistrés ensemble dans chaque version), `/api/generate` appelle `runSiteEdit` (`src/lib/site/edit-service.ts`). Le modèle de design (Anthropic ; repli Groq fort ; simulation en développement sans clé) renvoie des opérations (`updateSection`, `insertSection`, `removeSection`, `moveSection`, `setTheme`, `setSeo`, `setPrimaryCta`, `setModules`) validées par zod ; les photos choisies lui sont masquées puis rendues aux requêtes inchangées ; les nouvelles requêtes passent par le service de photos.
- **Contrôles automatiques puis annulation** (`edit.ts`, `edit-run.ts`, 3 essais) : sections non concernées strictement identiques et dans le même ordre, style/SEO/appel à l'action/modules inchangés sauf demande, pas de page vidée, aucun téléphone/email en dur, aucune adresse d'image inventée, contraste WCAG AA de la palette, rendu valide (un seul h1, HTML bien formé, aucun script). Au moindre problème : rien n'est enregistré, le modèle reçoit la raison et réessaie ; après 3 échecs, message clair et aucun crédit débité. Coût réel de chaque modification enregistré dans `site_generations` (tâche `edit`, migration 0018).
- **Migration** (`migrate.ts`, `npm run sites:migrate`, route admin `POST /api/admin/migrate-project`) : le site est recréé par le modèle de design à partir des données de l'entreprise et devient une NOUVELLE version ; anciennes versions, publications et messages du chat intacts. Restaurer une ancienne version rend le HTML d'origine et retire `site.json` (la restauration supprime désormais les fichiers absents de la version). Le snapshot des documents de conformité couvre maintenant tous les fichiers.
- **BOULANGERIE BRION migrée** (base de développement) : 1 essai, 0,044 €, 13 photos (Unsplash en mode Démonstration avec cache ; le quota de 50/h étant épuisé en cours de route, les photos manquantes ont été complétées après réinitialisation via `npm run sites:migrate -- --photos <id>`). Captures : `docs/screenshots/phase-q-lot4/`.
- **Publication** : un site au nouveau format est rendu depuis sa description (feuille de style séparée, polices servies par l'application, origine ajoutée à `font-src` de la CSP).
- Aperçu du Studio : un document HTML complet est affiché tel quel (plus de CDN Tailwind pour ces sites).

### Vérifié
- `npm run build`, `npm run lint`, `npx vitest run` (140 tests, dont 16 nouveaux `edit.test.ts`) : OK. `npm run test:e2e` : 49 tests OK (`e2e/phase-q-lot-4.spec.ts` Q4.1 à Q4.4, en simulation).
- **e2e avec la vraie IA** (`npm run test:e2e:real -- phase-q-lot-4-real`) : 2 demandes dans le chat (ajout d'une FAQ, puis style Élégant premium) ; sections existantes inchangées, 2 versions créées, contraste/débordement/alt mesurés dans le navigateur (ordinateur et mobile), journal : Anthropic `claude-sonnet-5-5`, 1 essai chacune, **0,0088 € et 0,0062 €**.

### Simulé ou restant
- Simulé : en développement sans clé (et dans la suite e2e normale), le « modèle » de modification est déterministe (FAQ, suppression d'une section, style, titre).
- Les modifications utilisent le modèle de design (et non Groq rapide comme prévu pour les petites retouches) : la description complète dépasse les 8 000 jetons/min de Groq. Coût mesuré < 0,01 € par demande.
- Les projets créés par l'onboarding actuel restent à l'ancien format (chat HTML historique) jusqu'au lot 5, qui crée directement des sites structurés ; on peut aussi les migrer avec `npm run sites:migrate`.
- Les modifications visent la page d'accueil (un seul site à une page pour l'instant).
- Unsplash reste en mode Démonstration (cache 30 jours) ; passage en Production non exigé avant le lancement.

### Comment vérifier
1. Connecté, ouvrez le Studio de BOULANGERIE BRION : l'aperçu montre le nouveau site avec photos.
2. Dans le chat, tapez « Ajoute une FAQ sur les commandes à l'avance » puis envoyez : une section de questions apparaît, le reste est identique.
3. Tapez « Passe le site au style Élégant premium » : l'apparence change, les textes restent.
4. Cliquez sur l'icône d'historique : les versions d'avant la migration sont toujours là ; « Restaurer » rend l'ancien site.

Couvert par `e2e/phase-q-lot-4.spec.ts` (simulation) et `e2e/phase-q-lot-4-real.spec.ts` (vraie IA).
