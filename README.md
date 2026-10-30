# Mihoji
La plateforme francaise de développement IA pour entrepreneurs. 

## Redémarrer le serveur

```bash
cd /workspaces/Mihoji/mihoji-app && npm run dev
```

## Environnements et migrations

Le développement utilise le projet Supabase actuel et `APP_ENV=development`. La
production doit utiliser un second projet Supabase situé dans l’Union européenne,
avec une URL, une clé publishable, une clé service, une base PostgreSQL et une
clé Groq distinctes. Copiez `.env.example` vers l’environnement concerné et ne
copiez jamais `.env.local`.

Pour appliquer les migrations à l’environnement sélectionné, renseignez
`DATABASE_URL`, puis exécutez :

```bash
cd /workspaces/Mihoji/mihoji-app && npm run db:migrate
```

Le script mémorise les fichiers appliqués dans `_mihoji_migrations` et peut être
relancé sur chaque base indépendamment.
