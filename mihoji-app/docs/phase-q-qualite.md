# Mission Q : qualité des sites générés (PRIORITÉ ABSOLUE)

Objectif : Mihoji doit générer, à partir d'une simple demande, des sites dont un artisan serait fier de montrer. On ne juge plus sur un seul projet mais sur un banc d'essai de 10 sites. Applique AGENTS.md. Un commit par lot. Résumé court en français à la fin de chaque lot, avec des captures d'écran.

## Principe d'architecture
L'IA ne doit plus écrire de HTML/CSS brut. Elle produit une **description structurée du site** (JSON validé par zod) : thème + pages + sections typées avec leurs contenus. Mihoji rend cette description en HTML statique avec ses propres composants, conçus avec soin. Les modifications sont des changements de cette description (jamais du code), ce qui garantit qu'une demande ne casse rien d'autre.

## Lot 1 : bibliothèque de sections et thèmes
- 12 à 15 types de sections, chacun avec 2 ou 3 variantes : en-tête avec grande photo, présentation, services/prestations (cartes), spécialités/produits, galerie photos, avis clients, chiffres clés, horaires, zone d'intervention, FAQ, équipe, appel à l'action, formulaire de contact/devis, plan d'accès, pied de page légal.
- 4 styles complets : « Artisan chaleureux », « Moderne épuré », « Élégant premium », « Dynamique coloré ». Chacun définit palettes (contraste WCAG AA garanti par construction), paire de polices (2 maximum, auto-hébergées), espacements, rayons, ombres, style des boutons.
- Principes de design imposés : beaucoup d'espace, hiérarchie typographique nette, vraies photos, un seul appel à l'action principal par écran, conception mobile d'abord, aucun texte de remplissage.
- CSS compilé (pas de CDN Tailwind), site statique léger.
- Les infos entreprise restent injectées via {{company.*}}.

## Lot 2 : génération par un modèle de design
- Ajoute un fournisseur Anthropic derrière l'interface LlmProvider (ANTHROPIC_API_KEY, modèle configurable AI_MODEL_DESIGN, défaut claude-sonnet-5-5). Sans clé, repli sur le modèle fort de Groq.
- Tâches create (création du site) et restyle (changement de style) : modèle de design. Petites retouches de texte : modèle rapide Groq.
- Création : demande + données entreprise + métier → le modèle choisit le style, la palette, les sections et leur ordre, et rédige des textes en français, concrets et plausibles pour ce métier précis (pas de généralités, pas d'erreurs de catégorie).
- Coût enregistré par génération (shadowCost en euros). Objectif : moins de 0,10 € par création de site.

## Lot 3 : photos
- Fournisseur d'images derrière une interface (Unsplash via UNSPLASH_ACCESS_KEY ; repli : bibliothèque locale de photos libres par métier).
- Le modèle propose des requêtes de photos adaptées (« boulangerie pain artisanal four », « plombier intervention salle de bain »…). Photos optimisées (tailles, formats modernes), textes alternatifs, crédit photographe respecté selon les règles d'Unsplash.

## Lot 4 : modifications et migration
- Toutes les demandes du chat modifient la description du site (ajout, suppression, réordonnancement de sections, textes, style, couleurs), jamais le HTML.
- Après chaque modification : rendu, contrôles automatiques (contraste, sections non concernées inchangées), sinon annulation et nouvel essai.
- Migre les projets existants (dont BOULANGERIE BRION) vers ce nouveau format en recréant un site de qualité à partir des données de l'entreprise, sans perdre l'historique.

## Lot 5 : la demande au cœur de l'onboarding
- Après le SIRET (ou la saisie manuelle), un écran « Décrivez le site que vous voulez », avec un grand champ, 3 exemples cliquables, et en option le choix visuel d'un des 4 styles (vignettes).
- Le site est créé à partir de cette demande et des données entreprise.

## Lot 6 : banc d'essai et contrôle qualité
- Script npm run benchmark : génère 10 sites à partir de 10 demandes variées (plombier, boulangerie, restaurant, kiné, coach sportif, avocat, fleuriste, garage auto, photographe, consultant), avec la vraie IA.
- Pour chacun : captures d'écran ordinateur et mobile (Playwright), score Lighthouse (performance, accessibilité, SEO, objectif ≥ 90), contrôles automatiques (contraste, débordements, images cassées, texte de remplissage).
- Galerie /admin/benchmark pour voir les 10 sites côte à côte, avec scores et coût de chaque génération.
- Montre-moi les captures des 10 sites dans ton résumé final.

## Fin de mission
Mets à jour docs/phase-q-progress.md, push sur main.

## Ajout important : sites fonctionnels, pas seulement informatifs
La description structurée du site doit prévoir dès le lot 2 des MODULES fonctionnels, en plus des sections d'affichage. Le modèle de design peut les proposer quand la demande ou le métier s'y prête (ex. restaurant → réservation, boutique → vente, artisan → devis, coach → rendez-vous + paiement).

## Principe des lots 7 à 9 : Mihoji connecte, il ne concurrence pas
Mihoji ne concurrence pas Wix ou Shopify ; il **connecte**. Un écran « Connexions » du Studio permet au commerçant de brancher ses outils (Stripe, Google Agenda, Calendly, Shopify/WooCommerce, Brevo, fiche Google). Chaque connecteur déclare des **capacités** que l'IA du Studio peut utiliser : à « ajoute la prise de rendez-vous avec acompte », l'IA s'appuie sur les connecteurs branchés (ou propose de les brancher). Jetons chiffrés en base, droits minimaux, déconnexion possible à tout moment.

## Lot 7 : images au service du contenu, connexions, devis, rendez-vous avec acompte, petite boutique
Ordre imposé, chaque étape testée avant la suivante :
1. **Images** : les photos servent le contenu (en-tête, une par prestation, réalisations ou avant/après pour les artisans, portrait pour les coachs et praticiens) ; plus de galerie posée en bas de page sans raison (retour du banc : coaching, plombier). *(Préalable fait : Pixabay source principale, Unsplash en secours plafonné.)*
2. **Écran « Connexions »** et cadre technique des connecteurs (capacités exposées à l'IA).
3. **Devis et contact réellement reçus** : stockage, notification email, tableau « Demandes reçues ».
4. **Rendez-vous avec acompte** via Stripe Connect (argent versé directement au commerçant ; mode test en développement).
5. **Petite boutique** : jusqu'à 50 produits, click & collect, paiement Stripe Connect.

## Lot 8 (plus tard) : connecteurs et webhooks
Connecteurs Shopify/WooCommerce (affichage et achat des produits existants), Google Agenda, Calendly, fiche Google, Brevo ; webhooks sortants signés et documentation Make/Zapier. Un connecteur qui exige une formule payante n'est pas implémenté en réel (signalé).

## Lot 9 (après la mise en production) : serveur MCP de Mihoji
OAuth par espace ; outils : lire et modifier le site via la description structurée, publier, consulter devis, rendez-vous et commandes. Compatible Claude, ChatGPT et Gemini, puis référencement dans leurs annuaires de connecteurs.

## Tests obligatoires (lots 7 à 9)
- Un test Playwright par étape, qui rejoue le parcours exact de l'utilisateur dans l'interface (pas seulement l'API).
- Stripe : test de bout en bout en mode test, cartes de test officielles (paiement réussi, refusé, remboursement), et vérification que l'argent est attribué au compte connecté du commerçant.
- Connecteurs : versions simulées pour les tests automatiques, plus un test réel quand la clé est disponible et que le service est gratuit.
- La suite complète passe en UNE seule exécution, entièrement verte. Un test instable est corrigé, pas relancé.

## Économie (règles prioritaires, aussi dans AGENTS.md)
Aucune génération de site superflue ; tests automatiques avec l'IA simulée (AI_MOCK) ; une seule vraie génération par lot, en fin de lot ; pas de mini-banc ni de banc complet par défaut (banc de 12 sites sur demande explicite) ; annonce et accord avant toute dépense d'IA de plus de 0,10 € ; aucun abonnement ou plan payant tiers ; Stripe en mode test uniquement ; emails simulés dans les tests ; pas d'E2B dans ce lot ; photos hébergées des projets de test supprimées automatiquement et alerte si le stockage Supabase approche des limites gratuites ; pendant le travail, tests ciblés seulement, suite e2e complète à la fin de chaque étape.

## Lot Q3 : Pexels, plus de « Bientôt disponible », banc réaliste, compositions par métier, formulaires Studio
1. Photos : **Pixabay** comme second fournisseur à la place de Pexels (Pexels abandonné : pas de clé disponible) — `PIXABAY_API_KEY`, conditions de l'API respectées (photos retenues téléchargées et hébergées, résultats en cache), mêmes contrôles de pertinence. Unsplash reste en mode Demo (50 requêtes/h). Banc avec vraies photos : les deux fournisseurs combinés, cache, requêtes étalées dans le temps (mode « patient »), temps estimé annoncé avant lancement.
2. Sur les sites (aperçu et publication), ne jamais afficher « Bientôt disponible » aux visiteurs : un module inactif est remplacé par un appel à l'action réel (téléphone, email, formulaire de contact).
3. Banc d'essai : données de test réalistes (vrais formats de numéros, adresses plausibles), pour que le juge ne pénalise plus des artefacts du banc.
4. Caractère distinctif : compositions de sections propres à chaque famille de métiers (restaurant : menu et réservation en premier ; artisan : réalisations et devis ; praticien : prestations et rendez-vous ; photographe : portfolio plein écran ; commerce : produits et click & collect).
5. Studio : formulaires dédiés pour les horaires et les chiffres clés (sans passer par le chat).
6. Relancer le banc avec les vraies photos (Pixabay + Unsplash, mode patient), 2 exécutions, comparer à Q2.
Livraison : commit « Phase Q – Lot Q3 », push, résumé court avec tableau comparatif.
