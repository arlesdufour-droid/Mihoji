# Progression mission Q — qualité des sites générés

## Lot 1 — bibliothèque de sections et thèmes — terminé

### Réel

- **Description structurée d’un site** (`src/lib/site/schema.ts`, zod) : thème (style + palette), SEO, un seul appel à l’action principal, pages et sections typées. Textes bruts uniquement (le rendu échappe tout), liens limités à `https:`, `#ancre`, `/chemin`, `tel:` et `mailto:`, images en `https:` ou chemin local. Les textes de remplissage (« Lorem ipsum », « Nom du service », « Service 1 », « Texte à venir »…) sont refusés par le schéma, ainsi qu’un `hero` hors première position, un pied de page hors dernière position ou une section unique en double.
- **15 types de sections, 2 ou 3 variantes chacun** : hero (photo, split, centré), présentation (image gauche/droite, texte), prestations (cartes, liste, icônes), produits/spécialités (grille, carte des prix, mise en avant), galerie (grille, mosaïque, défilement), avis (cartes, citation, liste), chiffres clés (bandeau, cartes), horaires (tableau, carte), zone d’intervention (pastilles, colonnes), FAQ (accordéon, colonnes), équipe (cartes, liste), appel à l’action (bandeau, carte, minimal), contact/devis (côte à côte, centré, coordonnées seules), plan d’accès (carte, côte à côte), pied de page légal (simple, colonnes). Navigation, menu mobile sans JavaScript et lien d’évitement inclus.
- **4 styles complets** (`src/lib/site/themes.ts`) : Artisan chaleureux (Fraunces + Nunito), Moderne épuré (Plus Jakarta Sans + Inter), Élégant premium (Cormorant + Inter), Dynamique coloré (Outfit + Inter). Chacun : 2 ou 3 palettes (11 au total), rayons, ombres, espacements, titres, style de boutons. **Contraste WCAG AA garanti par construction** : 14 paires texte/fond par palette vérifiées par test unitaire, puis mesurées dans le navigateur sur chaque exemple × chaque style × chaque palette.
- **CSS compilé, site statique léger** : aucun CDN ni script ; une feuille de style par site (19 à 21 Ko, ≈ 5 Ko compressée ; pages HTML de 11 à 17 Ko) qui n’inclut que les blocs des sections utilisées ; polices variables woff2 (sous-ensemble latin, 27 à 48 Ko, licence OFL) auto-hébergées dans `public/fonts/`, 2 familles au maximum par site, `font-display: swap`, préchargement ; images adaptatives (`srcset`, WebP) pour Unsplash, chargement différé, texte alternatif obligatoire, crédit photographe affiché.
- **Données entreprise toujours injectées** par `{{company.*}}` ; nouveau jeton `{{company.city}}` (ville déduite de l’adresse) ; les téléphone et email absents font disparaître leur ligne au lieu d’afficher un lien vide.
- **Galerie de contrôle `/admin/design`** (administrateurs) : 4 sites d’exemple (boulangerie, kiné, cabinet d’avocats, coach sportif), changement de style et de palette, catalogue des 15 types × variantes. Pages de rendu `/admin/design/render` (403 pour les non-admins).
- **Aperçu photo** : les exemples utilisent de vraies photos Unsplash récupérées par `scripts/fetch-sample-photos.ts` (`UNSPLASH_ACCESS_KEY`), avec crédit. Sans photo, un visuel aux couleurs du thème s’affiche.
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
