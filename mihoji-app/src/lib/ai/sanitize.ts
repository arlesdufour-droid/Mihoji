const fileLabels: Record<string, string> = {
  'index.html': 'la page d’accueil',
};

export function sanitizeSimpleText(text: string): string | null {
  const cleaned = text
    .replace(/```[\s\S]*?(```|$)/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    // Blocs et déclarations CSS sans balise (ex. « h1 { color: #1e3a8a; } », « color: blue; »).
    // Le point-virgule est exigé pour ne pas mutiler le français courant (« notre position : centrale »).
    .replace(/[a-z0-9.#-]+\s*\{[^{}]*\}/gi, ' ')
    .replace(/\b(color|background(?:-color|-image)?|font(?:-size|-family|-weight|-style)?|margin(?:-top|-bottom|-left|-right)?|padding(?:-top|-bottom|-left|-right)?|border(?:-radius|-color|-width)?|display|width|height|max-width|min-width|text-align|line-height|box-shadow|gap|position|top|left|right|bottom)\s*:\s*[^;\n]+;/gi, ' ')
    .replace(/\b[\w./-]+\.(tsx?|jsx?|html?|css|json|md)\b/gi, ' ')
    .replace(/^.*\b(Bon codage|Happy coding)\b.*$/gim, ' ')
    // Markdown technique : titres, emphases, puces.
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
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
