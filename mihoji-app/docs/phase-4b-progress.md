# Progression phase 4b

## Lot 0 — qualité de génération — terminé

### Réel

- **Une demande ne modifie que ce qu’elle vise** : après chaque génération, `enforceQuality` (`src/lib/engine/quality.ts`) compare les blocs du site avant/après. Demande de style (« titres en bleu ») : le texte, les balises et les attributs autres que `class`/`style` de tous les blocs doivent rester identiques. Demande de contenu : seuls les blocs visés (mots-clés, nom de balise, `data-mihoji`) peuvent changer ; un ajout ne touche à aucune section existante. Balisage cassé (balise fermante tronquée comme `</h2<p`) refusé.
- **Annulation et nouvel essai** : une modification refusée n’est pas enregistrée (aucune version créée) ; le modèle reçoit la raison et réessaie une fois. Si le second essai échoue aussi : « Je n’ai rien modifié… », sans crédit débité.
- **Lisibilité WCAG AA** : le contraste texte/fond (classes Tailwind, styles inline, dégradés, opacités) est calculé après chaque modification (`src/lib/engine/contrast.ts`, palette générée par `scripts/gen-tailwind-palette.ts`). Un texte devenu illisible à cause de la modification est automatiquement remis en clair (ou foncé), avec une mention dans le résumé (« J’ai gardé le texte de « … » clair… »).
- **Demandes échouées exclues de l’historique** envoyé au modèle (côté navigateur et côté serveur, `src/lib/ai/failure.ts`). Le résumé ne décrit que ce qui a réellement été appliqué (application partielle signalée honnêtement).
- **Cohérence métier** : le prompt système et le protocole de chat exigent des contenus plausibles pour le métier (activité de l’entreprise fournie au modèle, exemple « pas de croissant dans une liste de pains »).
- **Projet BOULANGERIE BRION réparé** (`npx tsx scripts/repair-project.ts <projectId>`) : balise `</h2<p` du bloc Horaires corrigée, titre du bandeau remis en clair. Le script est réutilisable pour tout projet.
- Les suppressions de fichiers demandées par le modèle sont désormais réellement enregistrées.

### Preuves

- Tests unitaires : `quality.test.ts`, `failure.test.ts`, `prompts.test.ts`.
- e2e simulés : `e2e/phase-4b-lot-0.spec.ts` (essai défectueux annulé puis réessayé, échec honnête sans modification, historique sans demande échouée).
- e2e vraie clé : `npm run test:e2e:real` (« titres en bleu foncé » sur le projet qualité : Horaires intact, bandeau lisible, aucun problème de contraste ; « Nos spécialités avec 3 pains »).

### Simulé ou restant

- L’analyse HTML est volontairement légère (pas de moteur CSS complet) : le contraste ignore les feuilles de style `<style>` et les variantes Tailwind (`md:`, `hover:`).
- Le plausible métier repose sur le prompt ; aucune vérification automatique du contenu.
