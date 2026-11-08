import Anthropic from '@anthropic-ai/sdk';
import { shadowCostEur } from '@/lib/ai/pricing';
import sharp, { type Metadata } from 'sharp';
import { JUDGE_MODEL, judgeMean, judgeSchema, judgeSystemPrompt, judgeUserMessage, pairSchema, pairSystemPrompt, pairUserMessage, type JudgeScores, type PairVerdicts } from './benchmark-rubric';

export type JudgeInput = { request: string; trade: string; company: string; desktopJpeg: Buffer; mobileJpeg: Buffer };
export type JudgeOutcome = { scores?: JudgeScores; mean?: number; costEur: number; promptTokens: number; completionTokens: number; error?: string };

// Sortie structurée par appel d'outil (choix « auto » : Opus 5.5 n'accepte pas l'outil forcé ; la consigne exige l'appel et une réponse sans outil est un échec avec nouvel essai) : l'API renvoie directement un objet (pas de JSON écrit à la main par le modèle, donc pas de guillemet qui casse l'analyse).
const text = { type: 'string' as const };
const criteriaKeys = ['texte', 'distinctif', 'hierarchie', 'photos', 'credibilite'] as const;
const scoreTool: Anthropic.Tool = {
  name: 'noter_le_site',
  description: 'Enregistre l’évaluation du site : pour chaque critère, une observation objective, une note de 1 à 5 et une justification.',
  input_schema: { type: 'object', properties: Object.fromEntries(criteriaKeys.map((key) => [key, { type: 'object', properties: { observation: text, note: { type: 'integer', minimum: 1, maximum: 5 }, raison: text }, required: ['observation', 'note', 'raison'] }])), required: [...criteriaKeys] },
};
const pairTool: Anthropic.Tool = {
  name: 'comparer_les_sites',
  description: 'Enregistre la comparaison de deux sites : pour chaque critère, le meilleur (A, B ou egal) et une justification.',
  input_schema: { type: 'object', properties: Object.fromEntries(criteriaKeys.map((key) => [key, { type: 'object', properties: { verdict: { type: 'string', enum: ['A', 'egal', 'B'] }, raison: text }, required: ['verdict', 'raison'] }])), required: [...criteriaKeys] },
};
const toolInput = (message: Anthropic.Message): unknown => message.content.find((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')?.input;

const image = (data: Buffer) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: data.toString('base64') } });

// Juge IA du banc d'essai : reçoit les captures ordinateur et mobile, note 5 critères de 1 à 5 (grille figée dans benchmark-rubric.ts).
// Un seul nouvel essai si la réponse n'est pas un JSON conforme ; le coût de tous les appels est comptabilisé.
export async function judgeSite(client: Anthropic, input: JudgeInput): Promise<JudgeOutcome> {
  let promptTokens = 0;
  let completionTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  const cost = () => shadowCostEur(JUDGE_MODEL, { promptTokens, completionTokens, cacheReadTokens, cacheWriteTokens });
  let lastError = 'réponse du juge illisible';
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const message = await client.messages.create({
        model: JUDGE_MODEL,
        max_tokens: 3_000,
        system: judgeSystemPrompt,
        tools: [scoreTool],
        messages: [{ role: 'user', content: [image(input.desktopJpeg), image(input.mobileJpeg), { type: 'text', text: judgeUserMessage({ request: input.request, trade: input.trade, company: input.company }) }] }],
      });
      promptTokens += message.usage.input_tokens ?? 0;
      completionTokens += message.usage.output_tokens ?? 0;
      cacheReadTokens += message.usage.cache_read_input_tokens ?? 0;
      cacheWriteTokens += message.usage.cache_creation_input_tokens ?? 0;
      const parsed = judgeSchema.safeParse(toolInput(message));
      if (parsed.success) return { scores: parsed.data, mean: judgeMean(parsed.data), costEur: cost(), promptTokens: promptTokens + cacheReadTokens + cacheWriteTokens, completionTokens };
      lastError = `réponse du juge non conforme : ${parsed.error.issues.slice(0, 3).map((issue) => `${issue.path.join('.')} ${issue.message}`).join(' ; ')}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'erreur du juge';
    }
  }
  return { costEur: cost(), promptTokens: promptTokens + cacheReadTokens + cacheWriteTokens, completionTokens, error: lastError };
}

// --- Comparaison par paires -----------------------------------------------------------------------------------------------------------

export type PairInput = { request: string; trade: string; company: string; a: { desktopJpeg: Buffer; mobileJpeg: Buffer }; b: { desktopJpeg: Buffer; mobileJpeg: Buffer } };
export type PairOutcomeJudged = { verdicts?: PairVerdicts; costEur: number; promptTokens: number; completionTokens: number; error?: string };

// Recadre les deux captures à la même hauteur (la plus petite des deux) : le juge compare la même étendue de page, pas la longueur.
export async function cropToSameHeight(first: Buffer, second: Buffer): Promise<[Buffer, Buffer]> {
  const [a, b] = await Promise.all([sharp(first).metadata(), sharp(second).metadata()]);
  const height = Math.min(a.height ?? 0, b.height ?? 0);
  if (!height) return [first, second];
  const crop = async (input: Buffer, meta: Metadata) => (meta.height && meta.height > height ? sharp(input).extract({ left: 0, top: 0, width: meta.width ?? 1, height }).jpeg({ quality: 70 }).toBuffer() : input);
  return Promise.all([crop(first, a), crop(second, b)]);
}

// Juge de paires : « Site A » et « Site B » (l'appelant décide de l'ordre, au hasard), un verdict par critère avec une phrase de justification.
export async function judgePair(client: Anthropic, input: PairInput): Promise<PairOutcomeJudged> {
  const [aDesktop, bDesktop] = await cropToSameHeight(input.a.desktopJpeg, input.b.desktopJpeg);
  const [aMobile, bMobile] = await cropToSameHeight(input.a.mobileJpeg, input.b.mobileJpeg);
  let promptTokens = 0;
  let completionTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  const cost = () => shadowCostEur(JUDGE_MODEL, { promptTokens, completionTokens, cacheReadTokens, cacheWriteTokens });
  let lastError = 'réponse du juge illisible';
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const message = await client.messages.create({
        model: JUDGE_MODEL,
        max_tokens: 2_000,
        system: pairSystemPrompt,
        tools: [pairTool],
        messages: [{ role: 'user', content: [image(aDesktop), image(aMobile), image(bDesktop), image(bMobile), { type: 'text', text: pairUserMessage({ request: input.request, trade: input.trade, company: input.company }) }] }],
      });
      promptTokens += message.usage.input_tokens ?? 0;
      completionTokens += message.usage.output_tokens ?? 0;
      cacheReadTokens += message.usage.cache_read_input_tokens ?? 0;
      cacheWriteTokens += message.usage.cache_creation_input_tokens ?? 0;
      const parsed = pairSchema.safeParse(toolInput(message));
      if (parsed.success) return { verdicts: parsed.data, costEur: cost(), promptTokens: promptTokens + cacheReadTokens + cacheWriteTokens, completionTokens };
      lastError = `réponse du juge non conforme : ${parsed.error.issues.slice(0, 3).map((issue) => `${issue.path.join('.')} ${issue.message}`).join(' ; ')}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'erreur du juge';
    }
  }
  return { costEur: cost(), promptTokens: promptTokens + cacheReadTokens + cacheWriteTokens, completionTokens, error: lastError };
}
