export type SeoIssue = { rule: string; file: string; line: number; message: string; fixHint: string };

export function auditSeo(files: Map<string, string>): SeoIssue[] {
  const issues: SeoIssue[] = [];
  for (const [file, content] of files) {
    if (!/\/page\.(tsx?|jsx?)$/.test(file)) continue;
    if (!/<h1\b/.test(content)) issues.push({ rule: 'h1-required', file, line: 1, message: 'La page ne contient pas de titre H1.', fixHint: 'Ajoutez un seul H1 descriptif.' });
    if ((content.match(/<h1\b/g) || []).length > 1) issues.push({ rule: 'single-h1', file, line: 1, message: 'La page contient plusieurs H1.', fixHint: 'Conservez un seul H1.' });
    if (/<img\b/.test(content) && !/<img\b[^>]*\balt=/.test(content)) issues.push({ rule: 'image-alt', file, line: 1, message: 'Une image n’a pas d’attribut alt.', fixHint: 'Ajoutez un texte alternatif utile.' });
    if (/\bhref=["']\/[^"']+["']/.test(content)) {
      for (const match of content.matchAll(/\bhref=["'](\/[^"']+)["']/g)) {
        const target = match[1];
        const targetFile = target === '/' ? 'app/page.tsx' : `app${target}/page.tsx`;
        if (!files.has(targetFile)) issues.push({ rule: 'internal-link', file, line: 1, message: `Le lien interne ${target} ne correspond à aucune page.`, fixHint: 'Corrigez le lien ou créez la page ciblée.' });
      }
    }
  }
  const layout = [...files.entries()].find(([file]) => /\/layout\.(tsx?|jsx?)$/.test(file))?.[1] || '';
  if (!/(?:metadata|generateMetadata)/.test(layout)) issues.push({ rule: 'metadata', file: 'app/layout.tsx', line: 1, message: 'Les métadonnées Next.js sont absentes.', fixHint: 'Ajoutez un titre et une description.' });
  if (!files.has('app/sitemap.ts')) issues.push({ rule: 'sitemap', file: 'app/sitemap.ts', line: 1, message: 'Le sitemap est absent.', fixHint: 'Ajoutez un sitemap Next.js.' });
  if (!files.has('app/robots.ts')) issues.push({ rule: 'robots', file: 'app/robots.ts', line: 1, message: 'La configuration robots est absente.', fixHint: 'Ajoutez robots.ts sans bloquer les pages publiques.' });
  return issues;
}
