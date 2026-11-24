import { injectCompanyData, type CompanyRenderInfo } from '@/lib/company/render';
import { absolutizeLeadActions, injectSiteId } from '@/lib/site/lead-form';
import { parseStoredSite } from '@/lib/site/files';
import { pageFile, renderSite } from '@/lib/site/render';

// Copie figée d'un site au moment de la publication : c'est elle, et non le brouillon du Studio, que les visiteurs voient.
// Nouveau format : description structurée (rendue à la demande, puis mise en cache). Ancien format : fichiers HTML déjà prêts.
export type PublishedSnapshot = {
  v: 1;
  projectId: string;
  // Origine de l'application : polices, photos des utilisateurs et formulaires (devis, rendez-vous, commandes) y sont servis, en adresses absolues.
  assetOrigin: string | null;
  company: { name: string; activity: string; address: string; legalForm: string; email: string | null; phone: string | null; missingFields: unknown };
  site: unknown | null;
  files: Record<string, string> | null;
};

export function companyForSnapshot(company: CompanyRenderInfo): PublishedSnapshot['company'] {
  return { name: company.name, activity: company.activity, address: company.address, legalForm: company.legalForm, email: company.email ?? null, phone: company.phone ?? null, missingFields: company.missingFields ?? {} };
}

export function isPublishedSnapshot(value: unknown): value is PublishedSnapshot {
  const snapshot = value as PublishedSnapshot | null;
  return Boolean(snapshot && snapshot.v === 1 && typeof snapshot.projectId === 'string' && snapshot.company && (snapshot.site || snapshot.files));
}

// Photos des utilisateurs : servies par l'application, donc adresses absolues dans un site hébergé sous un autre nom d'hôte.
function withPhotos(content: string, origin: string | null): string {
  return origin ? content.replaceAll('src="/api/site-photos/', `src="${origin}/api/site-photos/`).replaceAll('src="/api/hosted-photos/', `src="${origin}/api/hosted-photos/`) : content;
}

// Fichiers du site tels que servis : rendu, coordonnées de l'entreprise, identifiant du site, formulaires et photos en adresses absolues.
export function renderSnapshotFiles(snapshot: PublishedSnapshot): Record<string, string> {
  const origin = snapshot.assetOrigin;
  const site = snapshot.site ? parseStoredSite(JSON.stringify(snapshot.site)) : null;
  const raw: Record<string, string> = site ? renderSite(site, { fontBase: `${origin ?? ''}/fonts` }).files : { ...(snapshot.files ?? {}) };
  const company = snapshot.company as CompanyRenderInfo;
  return Object.fromEntries(Object.entries(raw).map(([path, content]) => [path, injectCompanyData(injectSiteId(origin ? absolutizeLeadActions(withPhotos(content, origin), origin) : content, snapshot.projectId), company)]));
}

// ——— Référencement propre à chaque site ———

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function urlPathOf(file: string): string {
  return file === pageFile('index') ? '/' : `/${file}`;
}

export function isHtmlFile(file: string): boolean {
  return file.endsWith('.html');
}

// Balise canonique de chaque page (adresse principale du site : domaine personnalisé vérifié, sinon sous-domaine), plan du site et robots.txt.
export function withSeo(files: Record<string, string>, canonicalOrigin: string, options: { indexable?: boolean } = {}): Record<string, string> {
  const indexable = options.indexable ?? true;
  const out: Record<string, string> = {};
  const pages: string[] = [];
  for (const [file, content] of Object.entries(files)) {
    if (!isHtmlFile(file)) { out[file] = content; continue; }
    pages.push(file);
    const canonical = `<link rel="canonical" href="${esc(`${canonicalOrigin}${urlPathOf(file)}`)}">`;
    const bare = content.replace(/<link rel="canonical"[^>]*>/g, '');
    if (bare.includes('</title>')) out[file] = bare.replace('</title>', `</title>${canonical}`);
    else if (/<head[\s>]/i.test(bare)) out[file] = bare.replace(/<head(\s[^>]*)?>/i, (head) => `${head}${canonical}`);
    // Ancien site (fragment HTML sans <head>) : enveloppé dans un document minimal pour porter la balise canonique.
    else out[file] = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${canonical}</head><body>${bare}</body></html>`;
  }
  out['robots.txt'] = indexable ? `User-agent: *\nAllow: /\n\nSitemap: ${canonicalOrigin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n';
  out['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.sort((a, b) => (a === pageFile('index') ? -1 : b === pageFile('index') ? 1 : a.localeCompare(b))).map((file) => `  <url><loc>${esc(`${canonicalOrigin}${urlPathOf(file)}`)}</loc></url>`).join('\n')}\n</urlset>\n`;
  return out;
}

// Chemin demandé → fichier du site (« / » → index.html, « /tarifs » ou « /tarifs/ » → tarifs.html, « /styles.css »…). null : introuvable.
export function resolveFile(files: Record<string, string>, pathSegments: readonly string[]): string | null {
  const clean = pathSegments.filter(Boolean);
  if (clean.some((segment) => segment === '..' || segment === '.' || segment.includes('\\'))) return null;
  const path = clean.join('/');
  if (path === '') return pageFile('index');
  const candidates = [path, `${path}.html`, path.endsWith('/index') ? pageFile('index') : ''].filter(Boolean);
  const found = candidates.find((candidate) => Object.prototype.hasOwnProperty.call(files, candidate));
  return found ?? null;
}

export const FILE_TYPES: Record<string, string> = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', txt: 'text/plain; charset=utf-8', xml: 'application/xml; charset=utf-8', json: 'application/json; charset=utf-8', svg: 'image/svg+xml' };

export function contentTypeOf(file: string): string {
  return FILE_TYPES[file.split('.').pop() ?? ''] ?? 'application/octet-stream';
}

// En-têtes de sécurité d'un site publié : aucun script, polices et images de l'application, formulaires envoyés à l'application (et au paiement Stripe).
export function siteSecurityHeaders(assetOrigin: string | null): Record<string, string> {
  const app = assetOrigin ? ` ${assetOrigin}` : '';
  return {
    'Content-Security-Policy': `default-src 'self'; font-src 'self'${app}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; script-src 'none'; form-action 'self'${app} https://checkout.stripe.com; base-uri 'none'; frame-ancestors 'none'`,
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}
