import type { PhotoCandidate } from './types';

// Sélection de la photo la plus pertinente pour un métier (logique pure, testée).
// Le premier résultat d'une recherche n'est pas toujours le bon (un drapeau américain pour « law office ») :
// on note chaque candidat sur son texte descriptif, on écarte les motifs hors sujet et on garde les meilleurs.

const STOP = new Set(['with', 'and', 'the', 'for', 'from', 'near', 'into', 'over', 'professional', 'modern', 'photo', 'image', 'close', 'view']);

// Motifs qui ne conviennent presque jamais à un site de commerce ou d'artisan, sauf si la requête les demande.
const OFF_TOPIC = ['flag', 'american', 'usa', 'united states', 'president', 'poster', 'logo', 'mockup', 'wallpaper', 'quote', 'umbrella', 'cartoon', 'illustration', 'meme', 'text', 'sign board', 'protest', 'dollar', 'politic'];

export function normalizeQuery(query: string): string {
  return query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function stem(word: string): string {
  return word.replace(/(ing|ers|er|es|s)$/, (suffix) => (word.length - suffix.length >= 3 ? '' : suffix));
}

export function queryWords(query: string): string[] {
  return [...new Set(normalizeQuery(query).split(' ').filter((word) => word.length > 2 && !STOP.has(word)).map(stem))];
}

export function scoreCandidate(candidate: PhotoCandidate, query: string, rank = 0): number {
  const words = queryWords(query);
  if (words.length === 0) return 0;
  const normalizedQuery = normalizeQuery(query);
  const alt = normalizeQuery(candidate.alt);
  const description = normalizeQuery(candidate.description);
  const tags = candidate.tags.map(normalizeQuery);
  let score = 0;
  let matched = 0;
  for (const word of words) {
    const inAlt = alt.includes(word);
    const inDescription = description.includes(word);
    const inTags = tags.some((tag) => tag.includes(word));
    if (inAlt) score += 3;
    if (inDescription) score += 2;
    if (inTags) score += 2;
    if (inAlt || inDescription || inTags) matched += 1;
  }
  // Une photo qui couvre l'ensemble des mots de la requête vaut beaucoup plus qu'une qui en couvre un seul.
  score += (matched / words.length) * 6;
  const haystack = ` ${alt} ${description} ${tags.join(' ')} `;
  for (const motif of OFF_TOPIC) {
    if (!normalizedQuery.includes(motif) && new RegExp(`\\b${motif}`).test(haystack)) score -= 8;
  }
  // Léger crédit à l'ordre du fournisseur (la pertinence propre d'Unsplash), sans jamais l'emporter sur le texte.
  return score - rank * 0.15;
}

// Part des mots de la requête que le texte de la photo (description, texte alternatif, mots-clés) contient.
export function coverage(candidate: PhotoCandidate, query: string): number {
  const words = queryWords(query);
  if (words.length === 0) return 0;
  const haystack = ` ${normalizeQuery(candidate.alt)} ${normalizeQuery(candidate.description)} ${candidate.tags.map(normalizeQuery).join(' ')} `;
  return words.filter((word) => haystack.includes(word)).length / words.length;
}

// Une photo doit couvrir au moins la moitié des mots de la requête : mieux vaut un visuel graphique qu'une photo hors sujet.
export const MIN_COVERAGE = 0.5;

// Candidats classés du plus au moins pertinent, sans ceux qui ne correspondent à aucun mot ou sont hors sujet.
export function isOffTopic(candidate: PhotoCandidate, query: string): boolean {
  const normalizedQuery = normalizeQuery(query);
  const haystack = ` ${normalizeQuery(candidate.alt)} ${normalizeQuery(candidate.description)} ${candidate.tags.map(normalizeQuery).join(' ')} `;
  return OFF_TOPIC.some((motif) => !normalizedQuery.includes(motif) && new RegExp(`\\b${motif}`).test(haystack));
}

// trusted : résultats d'une vraie recherche (Unsplash a déjà fait correspondre la requête à la photo, dont le texte ne cite pas toujours le métier) :
// on n'écarte que les motifs hors sujet, et le contrôle visuel tranche ensuite. Sinon, la photo doit couvrir la moitié des mots de la requête.
export function rankCandidates(candidates: PhotoCandidate[], query: string, limit = 6, options: { trusted?: boolean } = {}): PhotoCandidate[] {
  if (options.trusted) {
    return candidates.map((candidate, rank) => ({ candidate, rank, score: scoreCandidate(candidate, query, rank) })).filter((entry) => !isOffTopic(entry.candidate, query)).sort((a, b) => b.score - a.score).slice(0, limit).map((entry) => entry.candidate);
  }
  return candidates
    .map((candidate, rank) => ({ candidate, score: scoreCandidate(candidate, query, rank), covered: coverage(candidate, query) }))
    .filter((entry) => entry.score > 2 && entry.covered >= MIN_COVERAGE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

// Classement pour un emplacement qui a plusieurs formulations (requête principale + alternatives) : chaque photo prend sa meilleure note,
// les doublons (même photo trouvée par deux requêtes) sont fusionnés.
export function rankForSlot(pool: PhotoCandidate[], queries: string[], limit = 3): PhotoCandidate[] {
  const best = new Map<string, { candidate: PhotoCandidate; score: number }>();
  pool.forEach((candidate, rank) => {
    for (const query of queries) {
      if (coverage(candidate, query) < MIN_COVERAGE) continue;
      const score = scoreCandidate(candidate, query, rank % 20);
      if (score <= 2) continue;
      const known = best.get(candidate.src);
      if (!known || score > known.score) best.set(candidate.src, { candidate, score });
    }
  });
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit).map((entry) => entry.candidate);
}

// Unsplash exige tous les mots : une requête trop précise ne donne rien. On réessaie avec les mots les plus importants
// (le métier vient en premier), du plus long au plus court, au plus deux fois.
export function simplerQueries(query: string): string[] {
  const words = normalizeQuery(query).split(' ').filter(Boolean);
  const variants = [words.slice(0, 3), words.slice(0, 2)].map((list) => list.join(' '));
  return [...new Set(variants)].filter((variant) => variant && variant !== normalizeQuery(query) && variant.includes(' '));
}
