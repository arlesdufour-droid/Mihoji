import { keywordsOf } from '../ai/keywords';
import { blockLabel, blocksOf, blockSearchText, contentSignature, parseHtml, rawOf, structureIssues } from './html-analysis';
import { contrastIssues, fixContrast, introducedContrastIssues } from './contrast';
import type { ProjectFiles } from './operations';

export type RequestIntent = 'style' | 'content';

const CONTENT_VERBS = /\b(ajout\w*|cree\w*|insere\w*|nouvel\w*|nouveau\w*|supprim\w*|retire\w*|enleve\w*|remplace\w*|reecri\w*|redige\w*|ecri\w+|traduis\w*|renomm\w*)\b/;
const STYLE_WORDS = /\b(couleurs?|bleu\w*|rouge\w*|vert\w*|jaune\w*|orange\w*|violet\w*|rose\w*|noir\w*|blanc\w*|gris\w*|marron|beige|dore\w*|gras|italique|souligne\w*|taille|police|typographie|grand\w*|petit\w*|arrondi\w*|ombre\w*|fond|centre\w*|alignement|espacement|marges?|bordures?|clair\w*|fonce\w*)\b/;

// Une demande de style ne doit jamais changer le texte ni la structure ; une demande de contenu ne doit toucher que ce qu'elle vise.
export function classifyIntent(prompt: string): RequestIntent {
  const text = prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (CONTENT_VERBS.test(text)) return 'content';
  return STYLE_WORDS.test(text) ? 'style' : 'content';
}

const ADD_VERBS = /\b(ajout\w*|insere\w*|cree\w*|nouvel\w*|nouveau\w*)\b/;
const EDIT_VERBS = /\b(remplace\w*|supprim\w*|retire\w*|enleve\w*|modifi\w*|chang\w*|reecri\w*|corrig\w*)\b/;

// Une demande d'ajout ne doit toucher à aucune section existante, sauf celles qu'elle désigne.
function isPureAddition(prompt: string): boolean {
  const text = prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ADD_VERBS.test(text) && !EDIT_VERBS.test(text);
}

export type QualityOptions = {
  prompt: string;
  // Rend un texte lisible pour l'utilisateur (remplace les jetons {{company.*}}).
  describe?: (text: string) => string;
};

export type QualityOutcome =
  | { ok: true; files: ProjectFiles; notes: string[] }
  | { ok: false; reason: string };

function quote(labels: string[]) {
  return labels.slice(0, 3).map((label) => `« ${label} »`).join(', ');
}

function checkScope(beforeHtml: string, afterHtml: string, prompt: string, describe: (text: string) => string): string | null {
  const before = parseHtml(beforeHtml);
  const after = parseHtml(afterHtml);
  if (structureIssues(afterHtml) > structureIssues(beforeHtml)) {
    return 'Le HTML produit contient une balise mal fermée ou mal imbriquée. Garde un balisage valide : chaque balise ouverte doit être refermée.';
  }
  const beforeBlocks = blocksOf(before.root);
  const afterBlocks = blocksOf(after.root);
  const intent = classifyIntent(prompt);

  if (intent === 'style') {
    const unchanged = beforeBlocks.length === afterBlocks.length && beforeBlocks.every((block, index) => contentSignature(block, { attributes: true }) === contentSignature(afterBlocks[index], { attributes: true }));
    if (unchanged) return null;
    const touched = beforeBlocks.filter((block, index) => !afterBlocks[index] || contentSignature(block, { attributes: true }) !== contentSignature(afterBlocks[index], { attributes: true })).map((block) => describe(blockLabel(block)));
    return `La demande ne concerne que le style, mais le texte, la structure ou des attributs autres que class et style ont changé${touched.length ? ` dans : ${quote(touched)}` : ''}. Modifie uniquement les classes ou le style des éléments visés, sans toucher à leur texte, à leurs balises ni à leurs autres attributs (data-*, id, href…).`;
  }

  const remaining = new Map<string, number>();
  for (const block of afterBlocks) {
    const raw = rawOf(afterHtml, block);
    remaining.set(raw, (remaining.get(raw) ?? 0) + 1);
  }
  const changed = beforeBlocks.filter((block) => {
    const raw = rawOf(beforeHtml, block);
    const count = remaining.get(raw) ?? 0;
    if (count > 0) {
      remaining.set(raw, count - 1);
      return false;
    }
    return true;
  });
  if (changed.length === 0) return null;
  const keywords = keywordsOf(prompt);
  const concerned = new Set(beforeBlocks.filter((block) => {
    const haystack = blockSearchText(block);
    return keywords.some((keyword) => haystack.includes(keyword));
  }));
  const unexpected = concerned.size === 0 && !isPureAddition(prompt)
    ? (changed.length > 1 ? changed : [])
    : changed.filter((block) => !concerned.has(block));
  if (unexpected.length === 0) return null;
  return `La modification a aussi touché des parties du site qui n'étaient pas visées : ${quote(unexpected.map((block) => describe(blockLabel(block))))}. Ne modifie que ce que la demande vise et laisse les autres sections strictement identiques.`;
}

function toneNotes(fixes: { text: string; tone: 'clair' | 'foncé' }[], describe: (text: string) => string): string[] {
  if (fixes.length === 0) return [];
  const first = fixes[0];
  const label = describe(first.text);
  const others = fixes.length - 1;
  return [`J’ai gardé le texte de « ${label} »${others > 0 ? ` et ${others} autre${others > 1 ? 's' : ''} texte${others > 1 ? 's' : ''}` : ''} ${first.tone}, car la couleur demandée n’était pas assez lisible sur son fond.`];
}

// Contrôles appliqués à chaque modification : portée de la demande, balisage valide, lisibilité (WCAG AA).
export function enforceQuality(before: ProjectFiles, after: ProjectFiles, options: QualityOptions): QualityOutcome {
  const describe = options.describe ?? ((text: string) => text);
  const files: ProjectFiles = new Map(after);
  const notes: string[] = [];
  for (const [path, afterHtml] of after) {
    if (!path.endsWith('.html')) continue;
    const beforeHtml = before.get(path);
    if (beforeHtml === afterHtml) continue;
    if (beforeHtml !== undefined) {
      const reason = checkScope(beforeHtml, afterHtml, options.prompt, describe);
      if (reason) return { ok: false, reason };
    }
    const introduced = introducedContrastIssues(beforeHtml ?? '', afterHtml);
    if (introduced.length > 0) {
      const fixed = fixContrast(afterHtml, introduced);
      files.set(path, fixed.html);
      notes.push(...toneNotes(fixed.fixes, describe));
    }
  }
  return { ok: true, files, notes };
}

export { contrastIssues };
