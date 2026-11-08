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


## Lot 5 — la demande au cœur de l'onboarding — terminé

### Fait (code écrit)
- Nouvelle étape 4 « Décrivez le site que vous voulez » (`src/app/onboarding/request/page.tsx`) : grand champ, 3 exemples cliquables, choix facultatif de l'un des 4 styles (vignettes) ou « Mihoji choisit ».
- `POST /api/onboarding/site` + `src/lib/site/onboarding-service.ts` : création du projet au nouveau format (site.json + HTML rendu, photos, modules) via le modèle de design, journal `site_generations` rattaché au projet, messages du chat initiaux, débit de crédits (`site_creation`) hors simulation, limitation de débit.
- Parcours : SIRET → confirmation → coordonnées → demande → Studio. La saisie manuelle (`/onboarding/manual`) est maintenant un vrai formulaire (migration `0019_phase_q_lot_5.sql` : `companies.siret` et `siren` deviennent facultatifs, appliquée sur la base de développement).
- Logique pure testée : `src/lib/site/onboarding-request.ts` (+ test, 4 tests).

### Vérifié
- `npm run build`, `npx tsc --noEmit`, `npm run lint` et `npx vitest run` (144 tests) : OK.
- e2e simulé : suite complète `npm run test:e2e` 51 tests OK, dont `e2e/phase-q-lot-5.spec.ts` (Q5.1 saisie manuelle → demande → Studio, Q5.2 redirection sans entreprise).
- **e2e avec la vraie IA** (`npm run test:e2e:real -- phase-q-lot-5-real`, SIRET 91285838800024 → « Je veux un site chaleureux avec prise de commande en ligne » → Studio) : OK. Anthropic `claude-sonnet-5-5`, 1 essai, **0,036 à 0,043 € par création** (3 créations mesurées), style Artisan chaleureux, module boutique (click & collect) avec la section correspondante, photos réelles, aucun contraste ni débordement à 390 et 1280 px, `site.json` enregistré, une seule génération journalisée.
- Captures : `docs/screenshots/phase-q-lot5/` (`ecran-demande.jpg`, `studio-ordinateur.jpg`, `studio-mobile.jpg`). La capture mobile a été prise en mode développement (badge « Compiling » visible, photo du bandeau pas encore chargée).

### Point d'attention : échec intermittent avant la création
Sur 7 lancements de l'e2e réel, 3 ont échoué avant tout appel à l'IA (donc sans coût) : l'étape « Décrivez le site que vous voulez » n'apparaît pas dans les 30 s et l'utilisateur est renvoyé à `/onboarding/siret` (la page `request` renvoie à la première étape quand `GET /api/onboarding/company` ne renvoie pas de fiche). Un des échecs journalisait une erreur de doublon sur `companies_siret_key` ; les deux suivants n'ont laissé aucune trace côté serveur. Avec un journal des réponses `/api/onboarding/*` branché, 2 lancements de suite ont réussi : cause non établie (compilation à froid du serveur de développement, ou course entre l'enregistrement de la fiche et la lecture suivante). À surveiller ; aucune correction n'a été faite. Pour une exécution fiable : relancer la spec, un échec avant la création ne coûte rien.

### Comment vérifier
1. Connecté avec un compte sans entreprise, ouvrez `/onboarding/siret`. Deux chemins possibles :
   - SIRET : saisissez 91285838800024, cliquez sur « Rechercher mon entreprise », puis « Confirmer et continuer » ;
   - saisie manuelle : ouvrez `/onboarding/manual`, remplissez nom, métier et adresse (par exemple « 12 rue des Lilas, 17000 La Rochelle »), cliquez sur « Continuer ».
2. Renseignez les coordonnées (téléphone, email) quand elles sont demandées.
3. L'écran « Décrivez le site que vous voulez » s'affiche. Le bouton « Créer mon site » est grisé tant que la demande fait moins de 8 caractères.
4. Cliquez sur l'un des trois exemples : le champ « Votre demande » se remplit. Choisissez éventuellement un style (par exemple « Élégant premium »), ou laissez « Mihoji choisit ».
5. Cliquez sur « Créer mon site » : le message « Nous créons votre site » apparaît, le bouton passe à « Création en cours… », puis le Studio s'ouvre sur l'aperçu.
6. Dans l'aperçu, le nom de l'entreprise figure dans l'en-tête, le style correspond au choix (s'il y en a un), et aucun texte de remplissage n'apparaît.
7. Dans le chat, les deux premiers messages sont votre demande puis « Votre site est prêt ». L'historique des versions contient « Création initiale du site ».
8. Si l'IA est réelle (clé Anthropic présente), le solde de crédits baisse ; en simulation il ne bouge pas.
9. Rouvrez `/onboarding/request` sans entreprise enregistrée : vous êtes renvoyé vers `/onboarding/siret`.

Couvert par `e2e/phase-q-lot-5.spec.ts` (simulation : saisie manuelle, style choisi, base de données, redirection) et `e2e/phase-q-lot-5-real.spec.ts` (vraie IA, parcours SIRET 91285838800024 + « Je veux un site chaleureux avec prise de commande en ligne »).

### Reste à faire
- Suivre l'échec intermittent décrit plus haut (cause non établie).
- Le serveur de développement du port 3000 est arrêté après les tests : à relancer avec `npm run dev`.


## Lot 6 — banc d'essai et contrôle qualité — terminé

### Fait
- **Banc de 12 cas figés** (`src/lib/site/benchmark-cases.ts`, `BENCHMARK_VERSION = 1`) : plombier, boulangerie, restaurant, kinésithérapeute, coach, avocat, fleuriste, garage, photographe, consultant (les trois premiers cas reprennent `design-examples.ts`), plus deux cas « données pauvres » : `pauvre-naf` (activité = code NAF brut `47.78C`, sans libellé lisible) et `pauvre-demande` (« Je veux un site pour mon entreprise. »). Entreprises fictives, téléphones `01 99 00 xx xx`. Toute modification d'un cas incrémente la version : deux versions ne se comparent pas. Les entrées passent par la même fonction que l'onboarding (`designCompanyOf`), donc le banc mesure ce qu'un vrai utilisateur obtient.
- **`npm run benchmark`** (`scripts/benchmark.ts`) : vraie IA (refuse de tourner si le fournisseur n'est pas Anthropic), base de développement uniquement, séquentiel. Options : `-- plombier coach` (sous-ensemble), `--photos=local` (**défaut**, bibliothèque locale seule, sans cache ni Unsplash : comparable d'une exécution à l'autre) ou `--photos=unsplash` (jugement visuel ponctuel, non comparable), `--no-judge`, `--no-lighthouse`. Sortie dans `docs/benchmark/<AAAA-MM-JJ-HHmm>/` : `results.json`, description, HTML et captures ordinateur/mobile de chaque site ; `docs/benchmark/latest.json` n'est mis à jour que par une exécution complète. La source des photos est enregistrée dans `results.json` (et par site : photos locales, cache, appels Unsplash, requêtes sans photo).
- **Photos locales forcées** : option `local` de `resolveSitePhotos` (`photos/service.ts`) transmise par `runDesignGeneration` ; aucun changement du prompt, des styles ni des données envoyées au modèle.
- **Juge IA** (`benchmark-judge.ts`, grille figée et versionnée dans `benchmark-rubric.ts`, `RUBRIC_VERSION = 1`) : après chaque site, `claude-sonnet-5-5` reçoit la capture ordinateur et la capture mobile et note de 1 à 5, avec une phrase de justification, cinq critères : pertinence du texte pour le métier, caractère distinctif, hiérarchie visuelle, qualité et pertinence des photos, crédibilité (« un client contacterait-il cette entreprise ? »). Notes, justifications, tokens et coût du juge sont dans `results.json`, séparés du coût de génération.
- **Contrôles du rendu** (et non indicateurs de qualité) : contraste calculé, débordements (ordinateur et mobile), images sans `alt`, images cassées, texte de remplissage, **Lighthouse** (performance, accessibilité, SEO, bonnes pratiques, mobile et ordinateur) — Lighthouse vérifie que le rendu est correct, il ne dit rien de la qualité du site.
- **Indicateur d'uniformité** : répartition des styles et palettes, et nombre de sites qui partagent exactement la même suite de types de section.
- **Galerie `/admin/benchmark`** (administrateurs ; lien depuis `/admin/design`) : les 12 sites avec captures, notes et justifications du juge, contrôles, coût, uniformité, comparaison avec l'exécution précédente (si même version du banc, de la grille et même source de photos), et **un champ de note manuelle de 1 à 5 par site**, enregistré avec l'exécution (`manual.json`).

### Exécution de référence (`docs/benchmark/2026-11-06-2110`, photos locales, `claude-sonnet-5-5`, effort medium)
- 12 sites sur 12 créés, **coût total 0,562 €** : génération 0,440 € (moyenne **0,037 €** par site, de 0,026 à 0,069 €) + juge 0,122 € (≈ 0,010 € par site). Durée de génération totale ≈ 4 min 45 s. Deux sites ont eu besoin d'un 2ᵉ essai (consultant 0,056 €, `pauvre-demande` 0,069 €), ce qui double leur coût.
- **Note moyenne du juge : 2,98/5.** Par critère : hiérarchie visuelle 4,0 · texte pour le métier 3,8 · distinctif 2,8 · crédibilité 2,5 · **photos 1,8**. Les sites vont de 2,4 (`pauvre-demande`) à 3,2.
- **Contrôles du rendu** : aucun débordement, aucun contraste insuffisant, aucune image sans `alt` ni cassée, aucun texte de remplissage, sur les 12 sites. Lighthouse : 93 à 100 en performance mobile (100 sur ordinateur), accessibilité 96 à 100, SEO 100.
- **Uniformité** : styles artisan 5, moderne 4, premium 2, dynamique 1 ; palette terracotta 4 sites sur 12 ; aucune suite de sections partagée (12 suites distinctes). La variété vient des sections, moins du style : un site sur trois a l'apparence « artisan/terracotta ».
- **Constats** (à lire sur la planche `docs/screenshots/phase-q-lot6/planche-12-sites.jpg`) :
  - Les photos sont le point le plus faible. En mode local, 1 à 9 requêtes de photos par site restent sans résultat (9 sur 12 pour `pauvre-naf`) et laissent des cadres vides (galerie du photographe, plombier) ; certaines photos sont hors sujet (une boucherie en bandeau de la boutique « Maison Aubry », des clés pour une pompe à chaleur).
  - Les cas à données pauvres sont les moins bien notés (2,6 et 2,4) : avec un code NAF brut ou une demande d'une ligne, le modèle reste générique et le style retombe sur « artisan ».
  - Le critère « distinctif » reste à 3 presque partout : les sites sont propres mais interchangeables.

### Limites connues
- **Une seule exécution** : la variabilité du juge et du générateur d'une exécution à l'autre n'est pas encore mesurée (la sortie du modèle de design n'est pas déterministe). Avant de conclure sur un écart avant/après, relancer le banc (≈ 0,56 €) et regarder l'amplitude entre deux exécutions identiques.
- Le juge note à partir de captures (pas de navigation) ; les captures sont tronquées à 7 500 px de haut. Les éléments collants (en-tête) sont remis dans le flux pour la capture seulement.
- La galerie lit le disque du serveur (`docs/benchmark/`) : développement et Codespaces, pas un déploiement sans disque persistant.
- Chaque exécution complète pèse environ 11 Mo (captures, HTML, descriptions) : ne commiter que les exécutions de référence (celle du 2026-11-06 sert de base « avant »), pas chaque essai.
- Les mesures Lighthouse tournent sur un site servi en local, avec les photos distantes : performance sensible au réseau.

### Comment vérifier
1. Dans un terminal : `npm run benchmark` (environ 20 minutes, ≈ 0,56 €) ; pour un essai rapide : `npm run benchmark -- plombier` (≈ 0,05 €, ne remplace pas `latest.json`).
2. Connecté avec un compte administrateur, ouvrez `/admin/design` puis « Banc d'essai de qualité » (ou `/admin/benchmark`).
3. Vérifiez en haut : version du banc et de la grille, source des photos, modèle, coût (génération, juge, total), note moyenne du juge, uniformité.
4. Pour chaque site : captures ordinateur et mobile (cliquer la capture ouvre le site), notes et justifications du juge, contrôles du rendu et Lighthouse.
5. Cliquez sur une note de 1 à 5 : « Votre note : n/5 » s'affiche, la moyenne de vos notes se met à jour, et la note est retrouvée au rechargement ; un second clic sur la même note l'efface.
6. Après une seconde exécution, la section « Comparaison » montre l'écart de note et de coût ; elle indique « Non comparable » si la version du banc, celle de la grille ou la source des photos diffèrent.

Couvert par `src/lib/site/benchmark.test.ts` (8 tests : cas, grille, totaux, uniformité, comparaison) et `e2e/phase-q-lot-6.spec.ts` (3 tests : accès réservé aux administrateurs, affichage et comparaison, note manuelle). L'exécution réelle du banc n'est pas un test automatisé (elle coûte de l'argent).


## Lot Q2 — qualité 2 : photos, diversité, crédibilité — terminé (objectifs de notes non atteints, voir ci-dessous)

### Ménage (étape 0)
- Arbre Git propre au départ : le travail de la galerie de notation et des réglages était déjà commité. `docs/benchmark/*` est ignoré par Git, sauf l'exécution de référence `2026-11-06-2110` et `latest.json` (laissé sur la référence).
- Journal temporaire `/api/onboarding/*` : retiré (rien dans le code). Neutralisation de l'en-tête collant : uniquement dans `scripts/benchmark.ts`, pour les captures.
- **Échec intermittent de l'onboarding : cause trouvée et corrigée.** `missing-fields` renvoyait vers `/onboarding/siret` si on validait avant la fin du chargement de la fiche entreprise (démarrage à froid) ; le bouton est maintenant grisé tant que la fiche n'est pas chargée. Dans `confirmation`, l'enregistrement de la fiche n'était pas attendu avant le changement de page : il l'est maintenant.

### Fait
- **Photos** : 1 requête + 2 formulations alternatives par emplacement (`image.alternatives`) ; toutes les candidates sont comparées, les 3 meilleures sont contrôlées visuellement par Haiku (`photos/verify.ts`, une requête par site, vignettes de 400 px, ≈ 0,0005 € par site, plafond 0,01 €). Une photo refusée n'est jamais utilisée : l'emplacement reste un visuel graphique. Règles (`photos/rules.ts`) : galerie sans 3 bonnes photos masquée ; grille de produits à moins de la moitié de photos sans aucune photo ; bandeau ou présentation sans photo → composition typographique. Les formulations alternatives n'utilisent que le quota Unsplash restant au-delà d'une réserve de 8 requêtes ; cache 30 jours inchangé. Bibliothèque locale : 35 → 95 requêtes (plombier, peintre, électricien, maçon, menuisier, restaurant, kiné, coach, notaire, vétérinaire, etc.), la requête qui a trouvé une photo sert de mot-clé.
- **Photos de l'utilisateur** : onglet « Mes photos » du Studio (logo, boutique, réalisations ; redimensionnées à 1600 px, WebP, métadonnées GPS retirées, 24 au plus, stockées en base `site_photos`, servies par `/api/site-photos/<id>`), bouton « Utiliser mes photos dans le site » (sans IA ni crédit, nouvelle version). Elles passent avant Unsplash (logo dans l'en-tête, boutique en bandeau, réalisations en galerie) à la création comme après coup. Dans le site publié, adresse absolue.
- **Diversité** : 4 styles de plus (Minimal noir et blanc, Naturel et organique, Rétro années 70, Luxe sombre ; 4 polices ajoutées), 10 palettes de plus (29 au total, contraste AA testé), 3 compositions d'en-tête (`bar`, `split`, `solid`). Le modèle justifie son choix dans `theme.reason` ; le prompt donne une personnalité de marque par style et interdit tout style par défaut.
- **Crédibilité** : le modèle reçoit les vraies données (année de création Sirene — jamais pour une saisie manuelle —, ville, spécialités, ce qui distingue, horaires fournis). `facts.ts` : avis supprimés, chiffres clés gardés seulement s'ils viennent de l'entreprise, horaires seulement s'ils sont fournis ; chiffres, années, labels, certifications et récompenses inventés dans les textes → le modèle doit réécrire. Les sections retirées laissent un encart « à compléter » visible seulement dans l'aperçu du Studio (jamais publié). Le chat accepte un vrai avis, chiffre ou horaire fourni mot pour mot.
- **Onboarding** : 3 questions courtes facultatives (spécialités, ce qui distingue, photos) enregistrées dans `companies.profile` (migration `0020`).
- Divers : les e2e tournent dans un dossier de build séparé (`NEXT_DIST_DIR=.next-e2e`), donc même quand l'aperçu de développement est ouvert.

### Mesure (banc v1 inchangé, photos locales, `claude-sonnet-5-5`, mêmes 12 cas)
| Critère | Référence | Exécution A | Exécution B | Objectif |
|---|---|---|---|---|
| Note moyenne | 2,98 | 3,23 | 3,12 | — |
| Photos | 1,75 | 2,33 | 2,33 | ≥ 3 |
| Crédibilité | 2,50 | 3,08 | 2,83 | ≥ 3,5 |
| Caractère distinctif | 2,83 | 2,92 | 2,75 | ≥ 3,5 |
| Texte pour le métier | 3,83 | 3,92 | 3,67 | — |
| Hiérarchie visuelle | 4,00 | 3,92 | 4,00 | — |
| Style le plus fréquent | 5/12 (42 %) | 3/12 (25 %) | 3/12 (25 %) | ≤ 30 % |
| Coût par site (génération) | 0,037 € | 0,055 € | 0,055 € | < 0,10 € |

Écart entre A et B ≈ 0,1 point : les gains sur les photos (+0,6) et la crédibilité (+0,3 à +0,6) dépassent ce bruit ; le gain sur le caractère distinctif (+0,0 à +0,1) n'en sort pas. **Seul l'objectif de diversité est atteint.** Coût plus élevé que la référence (0,037 → 0,055 €) : réponses plus longues et nouveaux essais pour corriger les données inventées.

### Pourquoi les objectifs ne sont pas atteints
- **Photos** : en mode local, 0 à 7 requêtes par site restent sans résultat, car la bibliothèque (95 requêtes) ne couvre pas tout ce que le modèle demande (galeries de 6 à 9 images différentes). Un contrôle visuel qui refuse des photos laisse des cadres graphiques. La vraie recherche Unsplash serait bien meilleure, mais l'offre démonstration (50 requêtes par heure) ne permet pas de mesurer 12 sites. **À faire côté utilisateur : passer l'application Unsplash en « Production » (5 000 requêtes/h)**, puis lancer `npm run benchmark -- --photos=unsplash`.
- **Crédibilité** : le juge cite surtout des numéros fictifs du banc (`01 99 00 …`), les boutons « Bientôt disponible » (réservation, paiement) et l'absence d'avis ou de certificats, que nous refusons désormais d'inventer. Cette limite est voulue.
- **Caractère distinctif** : les styles varient, mais la structure des pages reste proche d'un site vitrine classique (héros, cartes, FAQ). Piste suivante : compositions de sections propres au métier et ordre des sections guidé par le métier.

### Comment vérifier
1. Connecté, ouvrez `/onboarding/manual`, remplissez nom, métier et adresse, cliquez sur « Continuer », puis complétez les coordonnées.
2. Sur « Décrivez le site que vous voulez », remplissez « Vos spécialités » et « Ce qui vous distingue », envoyez un logo (« Mon logo »), une photo (« Ma boutique ou mon atelier ») et trois photos (« Mes réalisations »), puis cliquez sur « Créer mon site ».
3. Dans l'aperçu : le logo est dans l'en-tête, vos photos sont dans le bandeau et la galerie, et deux encarts en pointillés « Avis de vos clients » et « Chiffres clés » indiquent qu'ils n'apparaissent pas sur le site publié.
4. Cliquez sur l'onglet « Mes photos », supprimez le logo, cliquez sur « Utiliser mes photos dans le site », revenez sur « Aperçu » : le logo a disparu de l'en-tête et une nouvelle version existe dans l'historique.
5. Dans « Mes photos », envoyez un fichier texte : le message « Format non accepté » s'affiche.
6. `/admin/design` : 8 styles dans la barre « Styles ». `/admin/benchmark` : « Style choisi » avec la justification du modèle pour chaque site et la part du style le plus fréquent.

Couvert par `e2e/phase-q-lot-q2.spec.ts` (Q2.1, Q2.2) et par les tests unitaires `facts.test.ts`, `user-photos.test.ts`, `photos/q2.test.ts`. Captures : `docs/screenshots/phase-q-lot-q2/` (avant/après).

### Simulé ou restant
- En simulation (tests e2e), pas de contrôle visuel ni de vraie recherche : le « modèle » renvoie les sites d'exemple, dont les avis et chiffres sont retirés par `enforceRealData`.
- Les horaires et les chiffres clés se donnent par le chat (« Nos horaires : … ») ; pas encore de formulaire dédié dans le Studio.
- Les boutons « Bientôt disponible » des modules pèsent sur la crédibilité jugée ; ce n'est pas traité ici.


## Lot Q3 — Unsplash patient, plus de « Bientôt disponible », banc réaliste, compositions par métier, formulaires Studio — code livré, banc avec vraies photos EN ATTENTE

### Fait
- **Photos — Pixabay** (clé `PIXABAY_API_KEY`, documentée dans `.env.example`) comme second fournisseur, en plus d'Unsplash (mode Demo). Pour chaque requête : cache 30 jours, puis Pixabay (toutes les formulations, ≤ 90 requêtes/min), puis Unsplash (requêtes principales seulement quand Pixabay répond, pour économiser les 45 requêtes/h) ; les deux listes sont entrelacées puis passent par le même classement par mots-clés et le même contrôle visuel (Haiku). **Conditions de l'API Pixabay** : les photos retenues sont téléchargées une fois et hébergées en base (`hosted_photos`, migration `0021`), servies par `/api/hosted-photos/<id>` (adresse absolue dans le site publié) ; aucune adresse Pixabay n'est affichée, ni envoyée à un tiers (le contrôle visuel reçoit l'aperçu téléchargé en base64) ; un téléchargement raté laisse le visuel graphique. Crédit « Photo : nom · Pixabay » sur le site. Test de fumée réel : `npx tsx scripts/smoke-photos.ts` (2 photos trouvées, contrôlées et hébergées en 4 à 8 s).
- **Mode patient** du banc (`npm run benchmark -- --photos=real`) : fenêtres glissantes (`photos/rate-window.ts`, testée) — le banc attend quand un quota est atteint au lieu de retomber sur la bibliothèque locale. En simulation et en banc « local », le cache n'est plus lu (résultats reproductibles).
- **« Bientôt disponible »** : plus jamais côté visiteur (aperçu et publication). Un module sans service en ligne affiche à la place des boutons réels : « Appeler le … », « … par email » (objet pré-rempli) et l'adresse ; les éléments sans donnée disparaissent. (Le texte reste dans les pages de facturation/réglages du Studio, qui ne sont pas des sites visiteurs.)
- **Banc réaliste** : numéros à indicatif régional cohérent avec la ville, non séquentiels ; exemples du banc corrigés (`BENCHMARK_VERSION` 2). **Les notes v1 (Q2) ne sont donc plus comparables automatiquement** : la comparaison avec Q2 se fera à la main dans ce fichier.
- **Compositions par métier** (`site/compositions.ts`) : cinq familles (restaurant, artisan, praticien, photographe, commerce) reconnues par métier/activité/demande ; consignes dans le prompt et ordre garanti après génération (bandeau en premier, pied de page en dernier, carte en variante « menu » pour le restaurant, portfolio en « masonry » juste après le bandeau pour le photographe).
- **Studio** : onglet « Horaires et chiffres » (formulaires dédiés, sans chat) ; chaque enregistrement crée une version, les horaires sont aussi mémorisés dans le profil de l'entreprise pour les prochaines créations ; un seul chiffre est refusé (2 à 4 requis) ; tout vider retire la section et ramène l'encart « à compléter ».
- Tests : `compositions.test.ts`, Pixabay (candidate, hébergement, crédit), `real-data-forms.test.ts`, attente du quota (`q2.test.ts`), `design.test.ts` ; e2e `phase-q-lot-q3.spec.ts` (Q3.1) et `phase-q-lot-2.spec.ts` mis à jour.

### Comment vérifier
1. Connecté, créez un site, cliquez sur l'onglet « Horaires et chiffres ».
2. Renseignez « Lundi » (7 h – 19 h), « Dimanche » (Fermé), une remarque, puis « Enregistrer les horaires » : message « Enregistré ». Dans « Aperçu », une section d'horaires apparaît.
3. Saisissez un seul chiffre puis « Enregistrer les chiffres clés » : message demandant au moins deux chiffres. Ajoutez-en un second : la section « chiffres clés » apparaît et l'encart pointillé disparaît.
4. Dans l'aperçu, aucun « Bientôt disponible » ; les modules proposent « Appeler… » et « …par email ».

### Reste / simulé
- **Banc avec vraies photos (point 6) : non lancé.** Estimation soumise à l'utilisateur avant lancement (voir le résumé de fin de lot).
- Suite e2e : une exécution d'un seul tenant a subi des plantages du navigateur (« Page crashed », mémoire de la machine) ; les 57 tests passent quand on relance les fichiers par groupes (24 + 14 + les autres du premier passage).

## Lot 7 — étape 1 : les photos servent le contenu — terminée

### Fait
- **Source des photos** : Pixabay en premier partout (génération réelle et banc) ; Unsplash seulement en secours (aucune photo trouvée, ou toutes refusées par le contrôle visuel), **au plus 4 appels par site, sans jamais attendre le quota** (`UNSPLASH_PER_SITE`, documenté dans `.env.example`) ; cache 30 jours maximal. Migration `0022` (contrainte `photo_cache.source` qui bloquait Pixabay), photos hébergées publiques dans `src/proxy.ts`, type d'image réel détecté (`sniffImageType`).
- **Une photo par prestation** : `services.items[].image` (schéma, rendu en cartes à photo, prompt). Règle : toutes les prestations ont une photo ou aucune (jamais de mélange avec des cadres vides).
- **Galerie justifiée** (`placeGalleries`) : retirée pour les praticiens/coachs/avocats/consultants ; gardée pour artisan, photographe, restaurant, commerce ; métier inconnu : gardée seulement si elle figure parmi les premières sections. Le prompt demande : photo d'en-tête, photo par prestation, portrait pour les praticiens, réalisations haut dans la page pour les artisans.
- Tests : `content-photos.test.ts` (5), `cache-source.test.ts` (7) ; e2e `phase-q-lot-7-1.spec.ts` (coach : photo par prestation, aucune galerie). Suite : 201 tests unitaires, 58 e2e en une exécution.

### Simulé / non livré
- **Avant/après non livré** : des photos de stock ne peuvent pas montrer les vrais chantiers du commerçant ; fabriquer un « avant/après » serait trompeur. Il ne sera possible qu'avec les photos de l'artisan (onglet « Mes photos »), à traiter plus tard.
- En simulation (e2e), le « modèle » reprend les photos de la galerie d'exemple comme photos de prestation pour un coach/kiné/avocat ; la pertinence réelle des photos se mesure avec la vraie IA (une génération en fin de lot, après accord sur le coût).

### Comment vérifier
1. Créez un site pour un coach sportif (saisie manuelle, « Coach sportif »).
2. Dans l'aperçu, la section des prestations montre une photo sur chaque carte ; il n'y a aucune section galerie.
Couvert par `e2e/phase-q-lot-7-1.spec.ts`.

## Lot 7 — étape 2 : écran « Connexions » et cadre des connecteurs — terminée

### Fait
- **Cadre technique** (`src/lib/connectors/`) : registre des connecteurs avec leurs **capacités** (ex. `payments.deposit`, `email.notify`), droits minimaux détaillés au commerçant ; chiffrement AES-256-GCM des jetons (`crypto.ts`, clé `CONNECTIONS_ENCRYPTION_KEY`, erreur explicite en production si absente) ; table `connections` (migration `0023`, un compte par outil et par espace, supprimée avec l'espace) ; routes `GET /api/connections`, `POST/DELETE /api/connections/<outil>` (aucun jeton ne sort jamais vers le navigateur, limite de 20 essais par heure).
- **Onglet « Connexions »** du Studio (mode simple et expert) : fiche par outil avec « ce que l'assistant pourra faire » et droits demandés ; Brevo connectable avec sa clé d'API (vérifiée auprès de Brevo, puis chiffrée) ; déconnexion à tout moment (jeton supprimé) ; les autres outils sont désactivés avec « Bientôt disponible ».
- **Capacités exposées à l'IA** : la modification par le chat reçoit la liste des outils branchés et des capacités utilisables ; quand une demande suppose un outil non branché (acompte, boutique, liste de contacts), la réponse du chat invite à le brancher dans « Connexions » (ou dit que l'outil arrive bientôt).
- **Correctif d'un test instable** (Q3.1) : cause réelle = course dans le Studio, une réponse plus ancienne pouvait écraser l'aperçu après deux enregistrements rapprochés ; corrigé par un compteur de requêtes dans `studio-shell.tsx`.
- Tests : `connectors.test.ts` (10 : chiffrement, altération, mauvaise clé, capacités, propositions) ; e2e `phase-q-lot-7-2.spec.ts`. Suite : 211 tests unitaires, 59 e2e en une exécution.

### Simulé / en attente
- La vérification de la clé Brevo est **simulée en e2e** (`CONNECTORS_MOCK=1`, clé « test-… » acceptée) ; en production la vérification réelle appelle `GET https://api.brevo.com/v3/account` (non testée en réel : aucune clé Brevo du commerçant disponible).
- Stripe (étape 4), Google Agenda, Calendly, Shopify/WooCommerce et fiche Google (lot 8) sont affichés « Bientôt disponible ».
- **À faire par vous avant la mise en production** : définir `CONNECTIONS_ENCRYPTION_KEY` (`openssl rand -base64 32`) dans l'environnement de production.

### Comment vérifier
1. Studio → onglet « Connexions ». Brevo : « Connecter Brevo », saisissez une clé, « Enregistrer la connexion » → « Brevo est connecté ».
2. Rechargez la page : Brevo reste connecté. « Déconnecter Brevo » → la clé est supprimée.
3. Dans l'aperçu, écrivez au chat « Ajoute la prise de rendez-vous avec acompte » : la réponse mentionne Stripe et l'onglet « Connexions ».
Couvert par `e2e/phase-q-lot-7-2.spec.ts`.
