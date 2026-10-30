<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Règles générales de la phase 2

1. Commence par lire le dépôt. Lis l'existant (route generate, `lib/ai/*`, `lib/billing/*`, `AGENTS.md`) et écris ton plan dans `docs/phase-2-plan.md` avant de coder.
2. Copie cette section « Règles générales » dans `AGENTS.md` (en remplaçant toute version précédente), pour qu'elle s'applique aussi aux conversations futures.
3. Livre lot par lot, dans l'ordre 0 → 1 → 2a → 2b → 3 → 4 → 5 → 6, avec un commit Git par lot (message : « Phase 2 – Lot X : … »). Après chaque lot :
   - `npm run build`, `npm run lint` et `npx vitest run` passent ;
   - résume dans `docs/phase-2-progress.md` ce qui est fait, ce qui est réel, ce qui est simulé et ce qui reste en stub.
4. Ne commence jamais un lot si le précédent n'est pas validé, sauf exception prévue explicitement (voir lot 2b).
5. Les fournisseurs externes passent par une interface TypeScript avec une implémentation réelle et une implémentation simulée active en développement quand la clé manque. En production, une clé absente renvoie une erreur explicite, jamais une simulation.
6. Aucun secret côté client. Toute nouvelle variable d'environnement est documentée dans `.env.example`. Ne modifie jamais `.env.local`.
7. Écris des tests unitaires Vitest pour toute logique pure : routage, modifications, crédits, audits de sécurité et SEO.
8. En cas de blocage externe, documente-le dans `docs/phase-2-progress.md`, explique en une phrase ce que l'utilisateur doit faire et passe au lot suivant s'il n'en dépend pas.
9. À la fin de chaque lot, donne un résumé court en français simple : ce qui marche, comment le tester dans l'aperçu et ce que l'utilisateur doit faire.

## Définition de « terminé » — phase 3b

- Un lot n'est terminé que si chaque fonction livrée fonctionne réellement de bout en bout avec les clés présentes dans `.env.local`, ou si elle est explicitement listée comme simulée, avec sa raison, dans le fichier de progression.
- Aucun bouton visible ne doit être sans action. Une fonction non disponible est soit masquée, soit affichée désactivée avec la mention « Bientôt disponible ».
- Aucune donnée métier (entreprise, projet, onboarding, version) n'est stockée dans `localStorage`. `localStorage` est réservé aux préférences d'affichage.
- Chaque résumé de fin de lot contient une section « Comment vérifier », avec les clics exacts à faire dans l'aperçu.
- Toute section « Comment vérifier » doit être couverte par un test Playwright qui passe. Un lot n'est pas terminé si ses tests e2e échouent.
