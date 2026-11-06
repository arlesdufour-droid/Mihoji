import { z } from 'zod';

// Grille FIGÉE du juge IA du banc d'essai (phase Q, lot 6). Toute modification de la grille ou de la consigne incrémente RUBRIC_VERSION :
// les notes de deux versions de grille ne se comparent pas. Le juge n'est pas le générateur et ne partage aucun prompt avec lui.
export const RUBRIC_VERSION = 1;

export const JUDGE_MODEL = 'claude-sonnet-5-5';

export const rubricCriteria = [
  { key: 'texte', label: 'Pertinence du texte pour le métier', question: 'Les textes (titres, prestations, produits, prix, questions) sont-ils propres à CE métier et à CETTE demande, concrets, sans généralités ni erreur de catégorie ?' },
  { key: 'distinctif', label: 'Caractère distinctif', question: 'Le site a-t-il une identité propre (ton, mise en page, ambiance) ou ressemble-t-il à un modèle générique interchangeable ?' },
  { key: 'hierarchie', label: 'Hiérarchie visuelle', question: 'L’œil sait-il où aller : titres lisibles, un appel à l’action principal évident, sections aérées et bien ordonnées, sur ordinateur comme sur mobile ?' },
  { key: 'photos', label: 'Qualité et pertinence des photos', question: 'Les photos sont-elles belles, cohérentes avec le métier et les textes, et bien intégrées (pas de photo hors sujet, floue ou répétée) ?' },
  { key: 'credibilite', label: 'Crédibilité', question: 'Un client contacterait-il cette entreprise sur la foi de ce site ? Inspire-t-il confiance (professionnalisme, informations pratiques claires, rien de louche ou d’inventé) ?' },
] as const;

export type RubricKey = (typeof rubricCriteria)[number]['key'];

const scoreSchema = z.object({ note: z.number().int().min(1).max(5), raison: z.string().trim().min(1).max(400) });

export const judgeSchema = z.object({
  texte: scoreSchema,
  distinctif: scoreSchema,
  hierarchie: scoreSchema,
  photos: scoreSchema,
  credibilite: scoreSchema,
});

export type JudgeScores = z.infer<typeof judgeSchema>;

export const judgeSystemPrompt = `Tu es un évaluateur indépendant de sites vitrines de petites entreprises françaises. On te montre deux captures d'écran d'un même site : la première sur ordinateur, la seconde sur mobile (pages entières, éventuellement tronquées en bas). Tu n'as pas écrit ce site. Sois exigeant et honnête : un site correct mais banal mérite 3, pas 4.

Note chaque critère de 1 à 5 (nombre entier) :
1 = mauvais, rédhibitoire · 2 = faible · 3 = correct mais banal · 4 = bon · 5 = excellent, un professionnel serait fier de le montrer.

Critères :
${rubricCriteria.map((criterion) => `- "${criterion.key}" — ${criterion.label} : ${criterion.question}`).join('\n')}

Pour chaque critère, donne UNE phrase de justification en français, précise et vérifiable sur les captures (cite un élément visible), sans formule générale.

Réponds UNIQUEMENT par un objet JSON valide, sans texte avant ni après, sans bloc de code :
{"texte":{"note":3,"raison":"…"},"distinctif":{"note":3,"raison":"…"},"hierarchie":{"note":3,"raison":"…"},"photos":{"note":3,"raison":"…"},"credibilite":{"note":3,"raison":"…"}}`;

export function judgeUserMessage(input: { request: string; trade: string; company: string }): string {
  return [
    `Entreprise : ${input.company}. Métier : ${input.trade}.`,
    `Demande du client : « ${input.request.trim()} ».`,
    'Image 1 : capture sur ordinateur. Image 2 : capture sur mobile.',
    'Évalue ce site selon la grille.',
  ].join('\n');
}

export function judgeMean(scores: JudgeScores): number {
  const values = rubricCriteria.map((criterion) => scores[criterion.key].note);
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}
