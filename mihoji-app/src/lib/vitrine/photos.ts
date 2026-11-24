// Photos hébergées en base (/api/hosted-photos/<id>) → fichiers statiques du dépôt (/vitrine/<slug>/photo-<n>.<ext>) : la vitrine ne dépend plus de la base.
// Logique pure et testée ; l'écriture des fichiers est faite par scripts/vitrine-generate.ts.
const HOSTED = /\/api\/hosted-photos\/([0-9a-f-]{36})/gi;

export function hostedPhotoIds(value: unknown): string[] {
  return [...new Set([...JSON.stringify(value).matchAll(HOSTED)].map((match) => match[1].toLowerCase()))];
}

export const extensionOf = (mime: string): 'webp' | 'jpg' | 'png' | null => (mime === 'image/webp' ? 'webp' : mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : null);

// Remplace chaque adresse hébergée par son chemin statique ; une adresse sans correspondance est une erreur (jamais une photo cassée en silence).
export function rewriteHostedPhotos<T>(value: T, paths: Record<string, string>): T {
  const rewritten = JSON.stringify(value).replace(HOSTED, (_match, id: string) => {
    const path = paths[id.toLowerCase()];
    if (!path) throw new Error(`photo_hebergee_sans_fichier:${id}`);
    return path;
  });
  return JSON.parse(rewritten) as T;
}

export const staticPhotoPath = (slug: string, index: number, extension: string) => `/vitrine/${slug}/photo-${String(index + 1).padStart(2, '0')}.${extension}`;
