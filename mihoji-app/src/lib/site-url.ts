export function getPublicOrigin(request: Request): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host || /(^|:)localhost($|:)/i.test(host) || host.startsWith('127.0.0.1') || host.startsWith('0.0.0.0')) return null;
  const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
  return `${protocol}://${host}`;
}

export const getSiteUrl = getPublicOrigin;

// Origine à utiliser pour les adresses de retour et de redirection : adresse publique configurée, sinon l'hôte réellement demandé par le navigateur
// (y compris en développement local, où l'adresse reconstruite par le serveur peut différer et ne porterait pas le cookie de session).
export function getRequestOrigin(request: Request): string {
  const configured = getPublicOrigin(request);
  if (configured) return configured;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (host) return `${request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'http'}://${host}`;
  return new URL(request.url).origin;
}
