import { renderSite } from './render';
import { siteSchema, type SiteDescription } from './schema';

// Fichiers d'un projet au nouveau format (partie pure, utilisable par les scripts et les tests).
// La description structurée est le fichier site.json (source de vérité) ; le HTML en est le rendu, CSS inclus pour l'aperçu.

export const SITE_FILE = 'site.json';

export function parseStoredSite(content: string | undefined): SiteDescription | null {
  if (!content) return null;
  try {
    const parsed = siteSchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// Fichiers d'un projet pour une description donnée : la description elle-même et son rendu.
export function siteFiles(site: SiteDescription): Map<string, string> {
  return new Map<string, string>([[SITE_FILE, `${JSON.stringify(site, null, 2)}\n`], ...Object.entries(renderSite(site, { inlineCss: true, studio: true }).files)]);
}

