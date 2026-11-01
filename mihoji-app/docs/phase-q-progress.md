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

## Lot 2 — génération par un modèle de design — en cours (WIP, commit « WIP lot 2 »)

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
- `npm run build` : passé plus tôt dans le lot ; **à relancer** après les derniers changements (interrompu).
- e2e : suite complète passée (43 tests, dont `e2e/phase-q-lot-2.spec.ts` Q2.1 à Q2.3 et Q1.5 étendu au type `module`) ; Q2.3 légèrement modifié ensuite et repassé seul.

### Simulé ou restant
- Simulé : le fonctionnement des modules (réservation, commande, paiement, newsletter, espace client) — lots 7 et 8 ; widgets et webhooks seulement décrits, pas rendus.
- Photos : le modèle propose des requêtes (en anglais) mais les images ne sont pas encore récupérées (lot 3) ; les captures montrent des visuels aux couleurs du thème.
- Les générations du laboratoire ne débitent pas de crédits (outil d'administration) ; le branchement au Studio et à l'onboarding relève des lots 4 et 5.
- Repli Groq non testé en réel (limite de 8 000 jetons/min susceptible de bloquer une création complète).

### Reste à faire pour clore le lot 2
1. Relancer `npm run build`.
2. Rédiger le résumé final du lot (section « Comment vérifier ») et faire le commit « Phase Q – Lot 2 : génération par un modèle de design ».
- Note : le serveur de développement de l'aperçu (port 3000) a été arrêté pour les e2e puis relancé avec `npm run dev` ; vérifier qu'il tourne.
