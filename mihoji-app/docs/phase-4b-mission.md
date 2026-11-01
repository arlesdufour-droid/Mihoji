# Mission phase 4b : qualité de génération et expérience produit

Relis ce fichier au début de chaque lot. Applique AGENTS.md. Un commit par lot (« Phase 4b – Lot X »). Tout en français. Résumé court à la fin de chaque lot.
Règle de preuve : chaque lot est vérifié par un test Playwright qui rejoue le parcours exact de l'interface. Pour le lot 0, utilise aussi npm run test:e2e:real (vraie clé, port 3000).

## Lot 0 : qualité de génération
- Une demande ne modifie QUE ce qu'elle vise : « titres en bleu » ne doit pas casser une autre section (le bloc Horaires est devenu « HorairesDu lundi au vendredi… » collé et en gras). Après chaque génération, vérifie automatiquement que les sections non concernées sont inchangées ; sinon, annule et réessaie.
- Lisibilité : vérifie le contraste texte/fond après chaque modification de couleur (niveau WCAG AA). Le titre « BOULANGERIE BRION » bleu foncé sur bandeau violet doit être corrigé automatiquement (texte clair), avec une mention dans le résumé.
- Les demandes échouées ne doivent pas être reprises dans les générations suivantes : exclus-les de l'historique envoyé au modèle. Le résumé ne doit décrire que ce qui a réellement été fait.
- Cohérence du contenu : le prompt système demande des contenus plausibles pour le métier (ex. pas de croissant dans une liste de « pains »).
- Répare le bloc Horaires du projet BOULANGERIE BRION.

## Lot 1 : pages d'accueil
- Barre du haut avec un sélecteur de public : « TPE & indépendants » (/) | « Agences & freelances » (/pro).
- / : titre « Artisans, commerçants, indépendants : le site de votre entreprise, en ligne en 10 minutes. » ; sous-titre « Conforme à la loi française. Sans connaissances techniques. » ; champ SIRET au centre avec bouton « Créer mon site » et lien « Pas encore de SIRET ? Décrivez votre activité » ; 3 garanties (mentions légales et RGPD inclus, hébergé en France, sans engagement) ; 4 vignettes d'exemples métiers cliquables (plombier, boulangerie, kiné, consultant) ; « Comment ça marche » en 3 étapes. Aucun jargon (ni « IA », ni « prompt », ni « crédits » en haut de page).
- /pro : titre « Agences web et freelances : livrez des sites conformes à vos clients en une heure, sous votre marque. » ; boutons « Créer mon espace agence » et « Voir une démo » ; capture du tableau de bord clients ; 4 atouts (marque blanche, code exportable, transfert au client, conformité automatique).
- Un visiteur arrivé par /pro va directement dans l'espace agence, sans repasser par le choix « Vous créez un site pour… ».

## Lot 2 : modifications sans IA
- Dans « Mon site », sections Mes horaires, Mes services, Mes coordonnées, Couleurs : modification directe, appliquée au site via les jetons {{company.*}} ou des données structurées, sans appel à l'IA et sans crédit. Le choix des couleurs garantit un contraste lisible.

## Lot 3 : suggestions rapides
- Au-dessus du chat, 3 à 4 suggestions cliquables adaptées au métier et à l'état du site (ex. « Ajouter des avis clients », « Ajouter un formulaire de devis », « Optimiser pour le mobile »). Un clic remplit le champ ; l'utilisateur valide.

## Lot 4 : modifier en cliquant
- Remplace « Bientôt disponible » sur « Modifier le design » : en mode sélection, un clic sur un élément de l'aperçu le surligne et l'indique au chat (« Élément sélectionné : titre "…" »). La demande suivante ne modifie que cet élément.

## Lot 5 : versions et export
- Historique : bouton « Comparer avec la version actuelle » (avant / après côte à côte).
- Porte Pro uniquement : « Exporter le code (ZIP) » du projet (fichiers du site + README d'installation), réservé aux formules payantes.

## Lot 6 : préparation internationale
- Champ pays sur companies (FR par défaut). Recherche d'entreprise derrière une interface par pays (FR = API Recherche d'entreprises ; autres pays = saisie manuelle). Conformité organisée par pays (compliance/fr/…). Aucun changement visible pour l'utilisateur français.

## Fin de phase
Mets à jour docs/phase-4b-progress.md, push sur main.