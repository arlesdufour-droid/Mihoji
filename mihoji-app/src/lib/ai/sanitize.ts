const fileLabels: Record<string, string> = {
  'index.html': 'la page d’accueil',
};

export function sanitizeSimpleText(text: string): string | null {
  const cleaned = text
    .replace(/```[\s\S]*?(```|$)/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\b[\w./-]+\.(tsx?|jsx?|html?|css|json|md)\b/gi, ' ')
    .replace(/^.*\b(Bon codage|Happy coding)\b.*$/gim, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
  return cleaned.length ? cleaned : null;
}

export function filesSummaryForUser(paths: string[]): string {
  const labels = paths.map((path) => fileLabels[path] ?? `le fichier ${path.split('/').pop()}`);
  return `C’est fait : ${labels.join(', ')} ${paths.length > 1 ? 'ont été mis à jour' : 'a été mis à jour'}.`;
}
