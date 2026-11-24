import { publishedDomain } from './config';

// À qui s'adresse une requête, d'après son nom d'hôte ? Partie pure (utilisée par le proxy et par les tests).
export type HostTarget =
  | { kind: 'app' }
  | { kind: 'subdomain'; slug: string }
  | { kind: 'custom'; hostname: string }
  | { kind: 'invalid' };

export type HostConfig = { publishedDomain: string | null; appHosts: readonly string[] };

export function normalizeHost(raw: string | null | undefined): string {
  return (raw ?? '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}

// Hôtes de l'application elle-même : poste local, adresse publique configurée, déploiements de prévisualisation et aperçu Codespaces.
export function appHostsFromEnv(): string[] {
  const hosts = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];
  for (const value of [process.env.NEXT_PUBLIC_SITE_URL, process.env.APP_HOST]) {
    if (!value) continue;
    try { hosts.push(normalizeHost(new URL(/^https?:\/\//.test(value) ? value : `https://${value}`).host)); } catch { /* valeur invalide ignorée */ }
  }
  return hosts;
}

const PLATFORM_SUFFIXES = ['.vercel.app', '.app.github.dev'];

export function resolveHost(rawHost: string | null | undefined, config: HostConfig = { publishedDomain: publishedDomain(), appHosts: appHostsFromEnv() }): HostTarget {
  const host = normalizeHost(rawHost);
  if (!host) return { kind: 'app' };
  if (config.appHosts.includes(host) || PLATFORM_SUFFIXES.some((suffix) => host.endsWith(suffix))) return { kind: 'app' };
  const domain = config.publishedDomain;
  if (domain) {
    if (host === domain) return { kind: 'app' };
    if (host.endsWith(`.${domain}`)) {
      const label = host.slice(0, -(domain.length + 1));
      return /^[a-z0-9-]+$/.test(label) ? { kind: 'subdomain', slug: label } : { kind: 'invalid' };
    }
  }
  // Tout autre nom d'hôte : domaine personnalisé candidat (le site n'est servi que si le domaine est vérifié).
  return /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(host) && host.includes('.') ? { kind: 'custom', hostname: host } : { kind: 'invalid' };
}

// Clé d'un site dans l'adresse interne /_site/<clé> : sous-domaine (sans point) ou nom de domaine complet.
export function siteKeyOf(target: HostTarget): string | null {
  return target.kind === 'subdomain' ? target.slug : target.kind === 'custom' ? target.hostname : null;
}

// Pages et fichiers qu'un site publié peut demander à l'application elle-même, sur son propre nom d'hôte (formulaires, photos, polices).
export function isSharedAssetPath(pathname: string, method: string): boolean {
  if (pathname.startsWith('/api/public/') || pathname.startsWith('/fonts/')) return true;
  return method === 'GET' && /^\/api\/(site-photos|hosted-photos)\/[0-9a-f-]{36}$/i.test(pathname);
}
