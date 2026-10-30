# Plan phase 4a

## Fournisseur de publication

Vercel est retenu pour le premier fournisseur : l’application est déjà préparée
pour Vercel, son API accepte un export statique sans ajouter de dépendance
client, et les domaines séparés peuvent être gérés par projet. La publication
est isolée derrière `PublishProvider`, avec un fournisseur simulé en
développement et un fournisseur Vercel en production.

Les domaines clients utilisent `PUBLISHED_SITES_DOMAIN`, distinct de
`NEXT_PUBLIC_SITE_URL`, afin de ne jamais partager les cookies de l’application.
