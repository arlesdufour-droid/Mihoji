# Mission qualité du 2026-11-08 (journal de travail, rapport final à la fin)

Dépense d'IA cumulée de la mission (compteur) : mini-banc photos 0,216 € ; audits du contrôle visuel ≈ 0,025 € ; validation du juge v2 ≈ 0,59 € (voir étape 2). Plafond d'arrêt : 1,50 €.

## Étape 1 — Photos : terminée
- Règle « toutes ou aucune » supprimée, visuel graphique pour les prestations sans photo, contrôle visuel moins sévère (rejet 49 % → 26 % sur 73 photos), mini-banc de 4 cas : note photos 2,25 → 2,75 (0,216 €).
- Point d'attention du juge (carte sans photo = « aplat ») : le visuel graphique est enrichi (motif en diagonale, dégradé du thème, grande icône) ; pas de nouvelle mesure payante pour ce seul réglage.

## Étape 2 — Juge v2 : implémenté et validé
### Ce qui a été fait
- **Grille v2** (`RUBRIC_VERSION = 2`) : pour chaque critère, descriptions ancrées des niveaux 1, 3 et 5 (2 et 4 « entre les deux »), règle d'utilisation de toute l'échelle, observation objective AVANT chaque note (pour la hiérarchie : nombre d'éléments qui se disputent l'attention, bouton principal visible sans défiler), toute note de 4 ou 5 cite un élément précis. Sortie par appel d'outil (le JSON écrit à la main échouait sur des guillemets droits).
- **Comparaison par paires** (`npm run benchmark:compare -- <ancienne> <nouvelle> [cas…]`) : « Site A / Site B » sans indication d'ancienneté, captures ordinateur et mobile recadrées à la même hauteur, **ordre tiré au hasard et équilibré** (moitié des cas dans chaque sens), verdict par critère (A / égal / B) avec une phrase de justification remis dans le sens ancienne/nouvelle, verdict global par comptage (jamais décidé par le modèle), test de signe exact par critère, **mesure du biais de position**. Section dédiée dans `/admin/benchmark`.
- **Tests** : 17 tests unitaires du juge et de la logique de paires (ordre équilibré, remise du verdict, test de signe, cas comparables, neutralité de la consigne, sortie structurée), e2e de la galerie (Q6.4).

### Choix du modèle juge : `claude-opus-5-5` (vision), différent du générateur `claude-sonnet-5-5`
- **Pourquoi** : (1) un autre modèle que celui qui crée les sites (pas de préférence pour sa propre production) ; (2) le plus discriminant des modèles disponibles ; (3) coût mesuré **0,033 à 0,042 € par site noté** et **0,032 € par comparaison de deux sites** (6 400 jetons en entrée, 560 en sortie après interdiction du texte hors outil), sous le plafond de 0,05 € par site.
- **Mesures réelles** (4 captures du mini-banc) : répétabilité — mêmes notes à l'identique sur deux appels séparés (texte 4, distinctif 3, hiérarchie 4, photos 3, crédibilité 3) ; **sensibilité** — en masquant le bandeau d'accueil sur ordinateur (titre, bouton, photo), la hiérarchie passe de 4 à **2** (≥ 2 points attendus) alors qu'avec la grille v1 elle valait 4 dans 36 sites sur 36 ; les notes de hiérarchie varient maintenant (3 et 4 sur les premiers sites).
- **Alternative testée** : `claude-haiku-5-5` (0,0008 € par appel, 50 fois moins cher) : plus faible en sensibilité (hiérarchie 4 → 3 seulement sur la capture dégradée). Gardé comme juge « économique » (`AI_MODEL_JUDGE=claude-haiku-5-5`) quand le budget ne permet pas Opus sur beaucoup de cas.
- **Coûts perdus** (honnêteté) : trois essais à 0,08 € chacun avant correction (réponse JSON invalide, puis réponse tronquée à 1 500 jetons) ; corrigés (appel d'outil, limite à 3 000 jetons, observations courtes).
