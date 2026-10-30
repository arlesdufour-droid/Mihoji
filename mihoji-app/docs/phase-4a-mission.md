# Mission phase 4a : correctifs du test utilisateur, puis mise en ligne technique

Relis ce fichier au début de chaque lot. Applique les règles de `AGENTS.md`, en particulier la « Définition de terminé ». Un commit par lot (« Phase 4a – Lot X : … »). `npm run build`, `npm run lint`, `npx tsc --noEmit` et `npx vitest run` doivent passer à la fin de chaque lot. Tiens à jour `docs/phase-4a-progress.md`.

Pour chaque service externe à créer (compte, clé, domaine), ne bloque pas : code l'intégration derrière une interface avec une version simulée, puis liste précisément dans ton résumé ce que je dois créer, où trouver chaque clé et quel nom de variable mettre dans `.env.local`. Ne modifie jamais `.env.local` toi-même.

## Lot 0 : correctifs issus du test utilisateur

**Erreurs et liens cassés**
- `assertProjectAccess` : valide le format de `projectId` (UUID) avant toute requête. Un identifiant invalide ou inconnu affiche une page 404 propre, jamais une erreur Postgres.
- `/studio/demo` (et toute adresse de Studio sans projet valide) redirige vers le dernier projet de l'utilisateur, ou vers `/onboarding` s'il n'en a pas.
- Remplace tous les liens qui pointent encore vers `/studio/demo` (logo, « Retour au Studio », facturation, menus) par un lien vers le dernier projet de l'utilisateur.
- Corrige l'erreur Next.js « blocking-prerender-current-time » (`Date.now()` pendant le prérendu) dans `StudioProjectLayout`, `BillingPage` et partout ailleurs où elle apparaît.
- Corrige tous les problèmes signalés par l'éditeur (onglet Problems, 10 au dernier comptage).
- Ajoute dans `README.md` une section « Redémarrer le serveur » (`cd /workspaces/Mihoji/mihoji-app && npm run dev`).

**Données de démo**
- Supprime toute trace de la variable `NEXT_PUBLIC_USE_DEMO_DATA` dans le code et `.env.example`. Le mode démo ne dépend que de l'absence de `DATABASE_URL`.
- Menu compte, nom de l'espace, facturation et factures affichent les vraies données de l'utilisateur connecté. Une formule Free sans paiement affiche « Aucune facture pour l'instant », jamais de fausses factures.

**Données entreprise**
- Forme juridique : convertis le code `nature_juridique` renvoyé par l'API en libellé lisible (ex. 5710 → « SAS, société par actions simplifiée »), via une table de correspondance des catégories juridiques INSEE, avec des tests.
- Activité : convertis le code NAF en libellé (ex. 10.71C → « Boulangerie et boulangerie-pâtisserie »), via la nomenclature NAF officielle. Le code brut ne doit jamais apparaître sur le site généré ; le texte du site utilise une formulation naturelle (« Votre boulangerie à La Rochelle »).
- Ajoute aux champs demandés à l'onboarding et au panneau « Mon site › Mes informations » : directeur de la publication, capital social, numéro RCS ou RM, médiateur de la consommation (si vente aux particuliers). Les champs obligatoires pour les mentions légales sont signalés comme tels.

**Conformité visible**
- Le panneau « Mon site » contient une section « Conformité » avec la liste de contrôle vert / orange / rouge et un bouton « Corriger » par point.
- Le bouton « Mettre en ligne » n'est plus désactivé en permanence : il lance les vérifications de conformité et de sécurité ; s'il reste un point rouge, il affiche lequel ; sinon il publie (lot 3).

**Studio en mode simple**
- En mode simple, les réponses de l'agent dans le chat ne montrent JAMAIS de code ni de Markdown technique. Elles affichent un résumé en français simple de ce qui a été fait (« J'ai ajouté une section Horaires : du lundi au vendredi, de 8 h à 18 h. »). Le code reste visible uniquement en mode expert.
- L'historique du chat est enregistré en base (table `chat_messages`) et réaffiché après rechargement.
- Le bouton « Historique des versions » ouvre un panneau latéral listant les versions (résumé, date, auteur) avec « Aperçu » et « Restaurer ». Restaurer crée une nouvelle version.
- Rends réels l'aperçu mobile (bascule de largeur) et « Choisir une page » (liste des pages du projet). Affiche « Bientôt disponible » sur « Modifier le design », « Modifier le texte », « Modifier le style », « Ajouter un commentaire », « Joindre un fichier » et le crayon « Nom de l'espace » / « Accès à l'espace » s'ils ne sont pas réalisés. Clarifie ou supprime le bouton « Site vitrine ».
- Le popover « Partager » se ferme avec Échap et au clic à l'extérieur.

**Comment vérifier :** j'ouvre `/studio/demo` et j'arrive sur mon vrai projet ; je refais le parcours avec un vrai SIRET de boulangerie ; le site affiche « boulangerie » et la vraie forme juridique ; le menu affiche mon email ; je recharge et le chat est conservé ; l'historique liste les versions ; la conformité est visible et passe au vert une fois les champs remplis ; aucune erreur Next.js ne s'affiche.

## Lot 1 : séparation développement / production
- Prévois deux environnements distincts : développement (base Supabase actuelle) et production (second projet Supabase, région UE). Aucune donnée ni clé partagée, y compris une clé Groq distincte pour la production.
- Script de migration applicable à chaque environnement, documenté dans `README.md`.
- Variable `APP_ENV` (`development` | `production`) affichée discrètement dans l'interface hors production.

## Lot 2 : hébergement de l'application Mihoji
- Prépare le déploiement de l'application sur Vercel (région Paris si disponible), avec variables d'environnement de production, domaine principal configurable via `NEXT_PUBLIC_SITE_URL` et redirections HTTPS.
- Documente pas à pas ce que je dois faire : création du compte, import du dépôt GitHub, saisie des variables, branchement du domaine.

## Lot 3 : publication réelle des sites des clients
- Les sites des clients sont publiés sur un domaine SÉPARÉ de l'application (valeur configurable `PUBLISHED_SITES_DOMAIN`), sous la forme `nom-du-site.<domaine>`, pour qu'un site client ne puisse jamais accéder aux cookies ou sessions de l'application.
- La publication exporte la dernière version construite en site statique et la déploie via un fournisseur derrière une interface `PublishProvider` (propose le fournisseur le plus adapté : Vercel, Netlify ou Cloudflare Pages ; justifie ton choix dans `docs/phase-4a-plan.md`). Implémentation simulée en dev.
- Chaque publication est enregistrée (table `publications` : projet, version, URL, date, statut). Le Studio affiche l'URL publique et « Dernière mise en ligne le … ».
- En-têtes de sécurité sur les sites publiés (CSP adaptée, HSTS, X-Content-Type-Options).
- Domaines personnalisés : prépare le modèle de données et l'interface (« Bientôt disponible »), sans les brancher.

## Lot 4 : vrai bac à sable de build (E2B)
- Remplace le stub `E2BSandboxProvider` par l'intégration réelle du SDK E2B (`E2B_API_KEY`), selon le lot 2b de `docs/phase-2-mission.md`.
- Si la clé est absente, garde le bac à sable simulé en dev et indique-moi comment créer le compte.

## Lot 5 : emails et connexion Google
- Prépare l'envoi des emails d'authentification via un SMTP dédié (Brevo recommandé, ou Resend) : documente les réglages à saisir dans Supabase › Authentication › SMTP Settings.
- Emails transactionnels de l'application (via le même fournisseur, derrière une interface `Mailer`) : bienvenue, site mis en ligne, crédits bientôt épuisés. Textes en français.
- Connexion Google : vérifie que le bouton « Continuer avec Google » fonctionne quand le fournisseur est configuré dans Supabase, et qu'il est masqué sinon. Documente pas à pas la configuration Google Cloud (écran d'autorisation, identifiant OAuth, URL de retour `https://<projet>.supabase.co/auth/v1/callback`) et Supabase.

## Lot 6 : robustesse et observabilité
- Intègre Sentry (serveur et navigateur, `SENTRY_DSN`), sans envoyer de données personnelles ni le contenu des prompts.
- Remplace la limite de fréquence en mémoire de `/api/generate` par une limite persistante (en base ou service dédié), valable sur plusieurs instances.
- Gère le refus de contenu par le modèle : message clair en français, aucun crédit débité.
- Vérifie le comportement en cas de délai dépassé : message clair, crédits débités uniquement pour ce qui a été consommé.
- Documente la stratégie de sauvegarde de la base de production (offre Supabase payante ou export quotidien automatisé).

## Lot 7 : anti-abus
- Avant chaque publication, analyse automatique du site : détection de formulaires demandant mots de passe, codes bancaires ou identifiants, imitation de marques connues (banques, livraison, administrations). Un site suspect est bloqué et signalé.
- Formulaire « Signaler ce site » accessible depuis chaque site publié (lien discret en pied de page).
- Possibilité de suspendre un site (il affiche alors une page « Site suspendu »).
- Limite de comptes gratuits : un seul espace Free par adresse email vérifiée, et limite de créations par adresse IP.

## Lot 8 : back-office et droits des utilisateurs
- Back-office `/admin`, réservé aux comptes dont l'email figure dans `ADMIN_EMAILS` : liste des utilisateurs et espaces, solde de crédits, ajout manuel de crédits (tracé dans le grand livre), sites publiés, signalements, suspension, demandes de support, coût IA estimé par espace (`shadowCost`).
- Dans Réglages : « Exporter mes données » (fichier JSON de toutes les données de l'espace) et « Supprimer mon compte » (avec confirmation, suppression effective des données et dépublication des sites).

## Fin de phase
Mets à jour `docs/phase-4a-progress.md` avec : ce qui est réel, ce qui est simulé, et la liste complète et ordonnée de ce que je dois créer ou configurer moi-même (comptes, clés, domaines), avec pour chacun l'adresse du site et le nom de la variable à renseigner. Push sur `main`.