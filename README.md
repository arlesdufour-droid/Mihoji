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

## Déployer Mihoji sur Vercel

1. Créez un compte sur [vercel.com](https://vercel.com), puis **Add New Project**.
2. Importez le dépôt GitHub `arlesdufour-droid/Mihoji` et indiquez
   `mihoji-app` comme **Root Directory**.
3. Sélectionnez la région **Paris (`cdg1`)** si elle est proposée. Le fichier
   `vercel.json` la demande déjà.
4. Dans **Settings → Environment Variables**, ajoutez pour **Production** :
   `APP_ENV=production`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `DATABASE_URL`, `GROQ_API_KEY`, `AI_MODEL_FAST`, `AI_MODEL_STRONG`,
   `AI_MODEL_FALLBACK` et `NEXT_PUBLIC_SITE_URL`. Utilisez uniquement les
   valeurs du projet Supabase de production et la clé Groq de production.
5. Lancez le déploiement. Vercel fournit HTTPS automatiquement ; le proxy
   redirige aussi toute requête HTTP vers HTTPS en production.
6. Dans **Settings → Domains**, ajoutez votre domaine principal. Renseignez la
   même URL HTTPS (sans chemin) dans `NEXT_PUBLIC_SITE_URL`, redéployez, puis
   vérifiez le callback Supabase avec cette URL.

## Emails et connexion Google

Pour les emails d’authentification, créez un compte [Brevo](https://app.brevo.com),
vérifiez votre expéditeur, puis dans Supabase ouvrez **Authentication → SMTP
Settings** et saisissez le relais SMTP Brevo, son port, votre identifiant et
votre clé SMTP. Pour les emails transactionnels Mihoji, renseignez
`BREVO_API_KEY`, `MAILER_FROM_EMAIL` et `MAILER_FROM_NAME`.

Pour Google : dans [Google Cloud Console](https://console.cloud.google.com),
créez un projet, configurez l’écran d’autorisation OAuth, puis créez un
identifiant OAuth « Application Web ». Dans Supabase → Authentication →
Providers → Google, saisissez l’identifiant et le secret. Ajoutez comme URL de
retour autorisée :
`https://<projet>.supabase.co/auth/v1/callback`.
Enfin, définissez `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`. Le bouton reste
masqué tant que cette variable vaut `false`.
