import { aiModels } from '../models';
import { RETRY_FEEDBACK_PREFIX } from '../failure';
import { DESIGN_PROMPT_MARKER } from '../../site/design-prompt';
import { isRestylePrompt, mockDesignJson, mockRestyleJson } from '../../site/design-mock';
import type { CompletionRequest, CompletionResult, LlmProvider } from './types';

const mockText = 'Mihoji a préparé une réponse de démonstration. Décrivez une modification pour continuer.';

const welcomeSection = '<section data-mihoji="accueil" class="mb-6 rounded-xl bg-indigo-50 p-5"><p class="text-xl font-semibold text-indigo-900">Bienvenue, nous sommes heureux de vous accueillir.</p></section>';
const hoursSection = '<section data-mihoji="horaires" class="mt-8 rounded-xl bg-slate-100 p-5"><h2 class="text-2xl font-bold">Horaires</h2><p class="mt-2">Du lundi au vendredi, de 8h à 18h.</p></section>';

function extractIndexHtml(filesMessage: string): string | null {
  const match = filesMessage.match(/--- index\.html ---\n([\s\S]*?)(?:\n--- [^\n]+ ---|$)/);
  return match ? match[1] : null;
}

const brokenHoursMarker = '</h2><p class="mt-2">Du lundi';

// Passe les titres en bleu foncé en ne modifiant que leurs classes, comme le ferait un bon modèle.
function blueHeadingsOperations(html: string) {
  const operations: { op: 'edit'; path: string; search: string; replace: string }[] = [];
  for (const match of html.matchAll(/<h[1-3]\b[^>]*>/g)) {
    const tag = match[0];
    const classMatch = tag.match(/class="([^"]*)"/);
    const kept = (classMatch?.[1] ?? '').split(/\s+/).filter((token) => token && !/^text-(?:[a-z]+-\d{2,3}|white|black)$/.test(token));
    const classes = [...kept, 'text-blue-900'].join(' ');
    const replace = classMatch ? tag.replace(classMatch[0], `class="${classes}"`) : tag.replace(/^<(h[1-3])/, `<$1 class="${classes}"`);
    if (replace !== tag) operations.push({ op: 'edit', path: 'index.html', search: tag, replace });
  }
  return operations;
}

function buildChatResponse(request: string, filesMessage: string, retried: boolean): string {
  const html = extractIndexHtml(filesMessage);
  if (!html) return mockText;
  if (/titres?/i.test(request) && /bleu/i.test(request)) {
    const operations = blueHeadingsOperations(html);
    // Premier essai défectueux : un modèle maladroit tronque la balise fermante du titre Horaires. Les contrôles qualité doivent l'annuler.
    if ((!retried || /maladroit/i.test(request)) && html.includes(brokenHoursMarker)) operations.push({ op: 'edit', path: 'index.html', search: brokenHoursMarker, replace: '</h2<p class="mt-2">Du lundi' });
    return JSON.stringify({ summary: 'J’ai mis les titres en bleu foncé.', operations });
  }
  if (/accueil|chaleureuse|bienvenue/i.test(request)) {
    if (html.includes('data-mihoji="accueil"')) return JSON.stringify({ summary: 'La phrase d’accueil est déjà en place.', operations: [] });
    const mainTag = html.match(/<main[^>]*>/);
    const operations = mainTag
      ? [{ op: 'edit', path: 'index.html', search: mainTag[0], replace: `${mainTag[0]}${welcomeSection}` }]
      : [];
    return JSON.stringify({
      summary: 'J’ai ajouté une phrase d’accueil chaleureuse en haut de la page.\n\n```tsx\n<header className="accueil">Bienvenue</header>\n```\nModifié app/page.tsx. Bon codage !',
      operations,
    });
  }
  if (/horaire|heures|lundi|8h/i.test(request)) {
    if (html.includes('data-mihoji="horaires"')) return JSON.stringify({ summary: 'Les horaires sont déjà affichés.', operations: [] });
    const operations = html.includes('</main>')
      ? [{ op: 'edit', path: 'index.html', search: '</main>', replace: `${hoursSection}</main>` }]
      : [];
    return JSON.stringify({
      summary: 'J’ai ajouté une section Horaires à votre page.\n\n```tsx\n<section className="horaires">…</section>\n```\nVoir app/page.tsx. Bon codage !',
      operations,
    });
  }
  if (/spécialit|pains?/i.test(request)) {
    const operations = html.includes('</main>')
      ? [{ op: 'edit', path: 'index.html', search: '</main>', replace: '<section data-mihoji="specialites" class="mt-8"><h2 class="text-2xl font-bold">Nos spécialités</h2><ul class="mt-3 grid gap-3 md:grid-cols-3"><li class="rounded-xl bg-slate-100 p-4">Pain au levain</li><li class="rounded-xl bg-slate-100 p-4">Pain complet</li><li class="rounded-xl bg-slate-100 p-4">Pain de campagne</li></ul></section></main>' }]
      : [];
    return JSON.stringify({
      summary: 'J’ai ajouté une section Nos spécialités avec 3 pains.\n\n```tsx\n<section className="specialites">…</section>\n```\nVoir app/page.tsx. Bon codage !',
      operations,
    });
  }
  return 'Voici le code à insérer :\n\n```tsx\n<section className="hero">…</section>\n```\nBon codage !';
}

export class MockProvider implements LlmProvider {
  async *stream(req: CompletionRequest) {
    const last = req.messages.at(-1)?.content ?? '';
    const earlier = req.messages.slice(0, -1);
    const request = [...earlier].reverse().find((message) => message.role === 'user' && !message.content.startsWith(RETRY_FEEDBACK_PREFIX))?.content ?? '';
    const retried = earlier.some((message) => message.content.startsWith(RETRY_FEEDBACK_PREFIX));
    const content = last.startsWith('Fichiers actuels') ? buildChatResponse(request, last, retried) : mockText;
    yield { content, totalTokens: 24, promptTokens: 12, completionTokens: 12, mock: true };
  }

  async *streamJson(req: CompletionRequest) {
    yield* this.stream(req);
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const system = req.messages.find((message) => message.role === 'system')?.content;
    const user = req.messages.find((message) => message.role === 'user')?.content ?? '';
    // Tâches de design simulées : site d'exemple adapté à la demande, ou changement de style.
    if (system?.startsWith(DESIGN_PROMPT_MARKER)) return { content: mockDesignJson(user), promptTokens: 0, completionTokens: 0, totalTokens: 0, model: 'simulation', mock: true };
    if (isRestylePrompt(system)) return { content: mockRestyleJson(user), promptTokens: 0, completionTokens: 0, totalTokens: 0, model: 'simulation', mock: true };
    return { content: mockText, totalTokens: 24, promptTokens: 12, completionTokens: 12 };
  }

  async listModels() {
    return [...aiModels];
  }
}
