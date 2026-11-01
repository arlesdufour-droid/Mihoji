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

## Lot 7 : modules transactionnels
- Devis/contact : réception côté serveur (plus de mailto), stockage, notification email, tableau « Demandes reçues » dans le Studio.
- Rendez-vous : créneaux configurables, confirmation et rappel par email, gestion dans le Studio.
- Paiement et boutique simple : catalogue, panier, click & collect, acomptes ; paiement via Stripe Connect (l'argent va directement au commerçant, Mihoji ne le détient jamais).
- Newsletter : inscription avec consentement RGPD, export des contacts.
- Espace client : connexion des clients du commerçant, documents, historique.
Chaque module fonctionne en simulation en développement, avec des tests e2e.

## Lot 8 : intégrations
- Widgets : Google Maps, avis Google, Calendly, bouton WhatsApp, flux Instagram.
- Webhooks sortants configurables par site (nouveau devis, rendez-vous, commande, inscription), signés, avec relance en cas d'échec et journal des envois. Documentation pour Make et Zapier.

## Lot 9 : bloc sur mesure (mode expert)
- En mode expert, un type de section « sur mesure » dont le code est généré par l'IA et testé dans le bac à sable E2B avant intégration, pour les besoins hors catalogue.