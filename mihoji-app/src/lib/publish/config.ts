// Configuration de la publication multi-tenant (variables d'environnement documentées dans .env.example).

// Domaine des sites publiés : <sous-domaine>.<PUBLISHED_SITES_DOMAIN> (ex. sites.mihoji.fr). null : non configuré.
export function publishedDomain(): string | null {
  const value = process.env.PUBLISHED_SITES_DOMAIN?.trim().toLowerCase().replace(/^\.+|\.+$/g, '');
  return value || null;
}

// Accès de test par chemin (/_site/<sous-domaine>/…) : jamais en production (le Codespace ne gère pas les sous-domaines).
export function devSitePathEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.APP_ENV !== 'production';
}

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
}
