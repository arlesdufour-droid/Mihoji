import { z } from 'zod';

// Grille FIGÉE du juge IA du banc d'essai (juge v2). Toute modification de la grille ou de la consigne incrémente RUBRIC_VERSION :
// les notes de deux versions de grille ne se comparent pas (la v1 n'avait pas de descriptions ancrées ; sa « hiérarchie » valait 4 sur 36 sites sur 36).
// Le juge n'est ni le générateur ni de la même famille de modèle (le design est fait par claude-sonnet-5-5) et ne partage aucun prompt avec lui.
export const RUBRIC_VERSION = 2;

// Modèle juge : Claude Opus 5.5 (vision), choisi pour être différent du générateur (évite la préférence d'un modèle pour sa propre production) et plus
// discriminant que Sonnet ; coût mesuré par site ≤ 0,05 € (voir docs/reports). Modifiable par AI_MODEL_JUDGE (le coût d'un autre modèle n'est alors pas garanti).
export const JUDGE_MODEL = process.env.AI_MODEL_JUDGE || 'claude-opus-5-5';
export const GENERATOR_MODEL = 'claude-sonnet-5-5';
export const JUDGE_COST_LIMIT_EUR = 0.05;

// Descriptions ANCRÉES : ce qu'on observe réellement à chaque niveau (1, 3 et 5) ; 2 et 4 sont « entre les deux ».
export const rubricCriteria = [
  { key: 'texte', label: 'Pertinence du texte pour le métier', question: 'Les textes (titres, prestations, produits, prix, questions) sont-ils propres à CE métier et à CETTE demande ?',
    anchors: { 1: 'Textes interchangeables (« Nos services », « Qualité et professionnalisme »), vocabulaire du métier faux ou absent, erreur de catégorie.', 3: 'Vocabulaire du métier correct et quelques prestations précises, mais des phrases génériques reviennent souvent.', 5: 'Prestations nommées avec des détails vérifiables (prix indicatifs, déroulé, zone d’intervention), ton cohérent, aucune formule creuse.' } },
  { key: 'distinctif', label: 'Caractère distinctif', question: 'Le site a-t-il une identité propre ou ressemble-t-il à un modèle interchangeable ?',
    anchors: { 1: 'Gabarit reconnaissable (bandeau, trois cartes, questions fréquentes) identique pour n’importe quel métier.', 3: 'Titres et ordre des sections adaptés au métier, mais composition et visuels classiques.', 5: 'On reconnaît le métier sans lire : structure, vocabulaire, visuels et rythme propres, mémorisable.' } },
  { key: 'hierarchie', label: 'Hiérarchie visuelle', question: 'L’œil sait-il où aller, sur ordinateur comme sur mobile ?',
    anchors: { 1: 'Aucun point d’entrée clair : plusieurs éléments se disputent l’attention, l’appel à l’action est noyé ou absent.', 3: 'Titre lisible et bouton principal visible, mais tailles et espacements monotones, sections de même poids visuel.', 5: 'Parcours évident (accroche, preuve, action), un seul bouton dominant par écran, rythme varié des sections, tout aussi net sur mobile.' } },
  { key: 'photos', label: 'Qualité et pertinence des photos', question: 'Les photos sont-elles belles, cohérentes avec le métier et bien intégrées ?',
    anchors: { 1: 'Photos absentes, cassées, cadres vides ou hors sujet.', 3: 'Photos présentes et globalement pertinentes, mais génériques, sombres ou incohérentes entre elles ; ou quelques cadres graphiques à la place de photos.', 5: 'Toutes pertinentes pour le métier, cohérentes entre elles (lumière, style), au service du contenu (une par prestation, portrait, réalisations).' } },
  { key: 'credibilite', label: 'Crédibilité', question: 'Un client contacterait-il cette entreprise sur la foi de ce site ?',
    anchors: { 1: 'Données manifestement inventées ou incohérentes, cadres vides, rien de vérifiable.', 3: 'Informations plausibles mais sans preuve (peu d’avis, d’horaires, de mentions) ; rien de louche.', 5: 'Coordonnées, horaires et mentions clairs et réels, preuves vérifiables (ancienneté, zone, prix), rien d’inventé.' } },
] as const;

export type RubricKey = (typeof rubricCriteria)[number]['key'];

// Une observation objective AVANT la note évite les notes d'impression (toutes à 4) : ce que le juge compte et voit, puis la note, puis la justification.
const scoreSchema = z.object({ observation: z.string().trim().min(1).max(500), note: z.number().int().min(1).max(5), raison: z.string().trim().min(1).max(400) });

export const judgeSchema = z.object({
  texte: scoreSchema,
  distinctif: scoreSchema,
  hierarchie: scoreSchema,
  photos: scoreSchema,
  credibilite: scoreSchema,
});

export type JudgeScores = z.infer<typeof judgeSchema>;

const anchorsText = rubricCriteria.map((criterion) => `- "${criterion.key}" — ${criterion.label} : ${criterion.question}\n    1 = ${criterion.anchors[1]}\n    3 = ${criterion.anchors[3]}\n    5 = ${criterion.anchors[5]}`).join('\n');

export const judgeSystemPrompt = `Tu es un évaluateur indépendant et exigeant de sites vitrines de petites entreprises françaises. On te montre deux captures d'écran d'un même site : la première sur ordinateur, la seconde sur mobile (pages entières, éventuellement raccourcies).

Échelle de 1 à 5 (nombre entier), avec des niveaux ANCRÉS : 1, 3 et 5 sont décrits pour chaque critère ; 2 est entre 1 et 3, 4 entre 3 et 5.
${anchorsText}

Règles de notation :
- Utilise toute l'échelle. Un site correct et banal mérite 3 ; réserve 4 aux sites nettement au-dessus d'un site correct et 5 à ceux dont un professionnel serait fier. Ne mets pas la même note partout par habitude : chaque critère se juge séparément.
- Pour chaque critère, écris d'abord une OBSERVATION objective et factuelle de ce que tu vois (éléments comptés ou cités), en 1 ou 2 phrases courtes (250 caractères au plus). Pour "hierarchie", l'observation indique le nombre d'éléments qui se disputent l'attention en haut de page et si le bouton principal est visible sans défiler. Pour "photos", elle indique combien de photos et de cadres graphiques tu vois. Pour "credibilite", elle liste les informations pratiques visibles.
- Puis donne la note, puis UNE phrase de justification précise qui s'appuie sur l'observation. Toute note de 4 ou 5 cite un élément précis des captures.

N'écris AUCUN texte en dehors de l'appel d'outil (pas d'analyse préalable, elle coûte cher). Enregistre ton évaluation en appelant l'outil « noter_le_site » (un objet par critère : observation, note, raison). Dans les textes, n'utilise pas le guillemet droit : préfère les guillemets français « ».`;

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

// --- Comparaison par paires ------------------------------------------------------------------------------------------------------------

const pairVerdictSchema = z.object({ verdict: z.enum(['A', 'egal', 'B']), raison: z.string().trim().min(1).max(400) });
export const pairSchema = z.object({ texte: pairVerdictSchema, distinctif: pairVerdictSchema, hierarchie: pairVerdictSchema, photos: pairVerdictSchema, credibilite: pairVerdictSchema });
export type PairVerdicts = z.infer<typeof pairSchema>;

export const pairSystemPrompt = `Tu es un évaluateur indépendant et exigeant de sites vitrines de petites entreprises françaises. On te montre DEUX sites créés pour la même demande : « Site A » puis « Site B ». Pour chacun, deux captures (ordinateur puis mobile), recadrées à la même hauteur. Juge uniquement ce que tu vois.

Pour chaque critère, dis lequel est meilleur : "A", "B" ou "egal" (seulement si la différence est négligeable). Critères, avec leurs niveaux ancrés (1, 3, 5) pour t'aider à voir les différences :
${anchorsText}

Règles :
- Ne favorise pas le premier site ni le second ; l'ordre est tiré au hasard. Ne favorise pas non plus le site le plus long ou le plus chargé.
- Chaque critère se juge séparément ; "egal" n'est pas un refuge, utilise-le seulement quand tu ne vois vraiment aucune différence.
- UNE phrase de justification par critère, précise et vérifiable sur les captures (cite un élément visible de chaque site).

N'écris AUCUN texte en dehors de l'appel d'outil (pas d'analyse préalable, elle coûte cher) ; chaque justification tient en une phrase de 30 mots au plus. Enregistre ta comparaison en appelant l'outil « comparer_les_sites » (un objet par critère : verdict A, B ou egal, et raison). Dans les textes, n'utilise pas le guillemet droit : préfère les guillemets français « ».`;

export function pairUserMessage(input: { request: string; trade: string; company: string }): string {
  return [
    `Entreprise : ${input.company}. Métier : ${input.trade}.`,
    `Demande du client : « ${input.request.trim()} ».`,
    'Image 1 : Site A sur ordinateur. Image 2 : Site A sur mobile. Image 3 : Site B sur ordinateur. Image 4 : Site B sur mobile.',
    'Compare les deux sites critère par critère.',
  ].join('\n');
}
