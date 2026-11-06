import Anthropic from '@anthropic-ai/sdk';
import { shadowCostEur } from '@/lib/ai/pricing';
import { extractJson } from './design';
import { JUDGE_MODEL, judgeMean, judgeSchema, judgeSystemPrompt, judgeUserMessage, type JudgeScores } from './benchmark-rubric';

export type JudgeInput = { request: string; trade: string; company: string; desktopJpeg: Buffer; mobileJpeg: Buffer };
export type JudgeOutcome = { scores?: JudgeScores; mean?: number; costEur: number; promptTokens: number; completionTokens: number; error?: string };

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
        max_tokens: 1_500,
        system: judgeSystemPrompt,
        messages: [{ role: 'user', content: [image(input.desktopJpeg), image(input.mobileJpeg), { type: 'text', text: judgeUserMessage({ request: input.request, trade: input.trade, company: input.company }) }] }],
      });
      promptTokens += message.usage.input_tokens ?? 0;
      completionTokens += message.usage.output_tokens ?? 0;
      cacheReadTokens += message.usage.cache_read_input_tokens ?? 0;
      cacheWriteTokens += message.usage.cache_creation_input_tokens ?? 0;
      const text = message.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
      const parsed = judgeSchema.safeParse(extractJson(text));
      if (parsed.success) return { scores: parsed.data, mean: judgeMean(parsed.data), costEur: cost(), promptTokens: promptTokens + cacheReadTokens + cacheWriteTokens, completionTokens };
      lastError = `réponse du juge non conforme : ${parsed.error.issues.slice(0, 3).map((issue) => `${issue.path.join('.')} ${issue.message}`).join(' ; ')}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'erreur du juge';
    }
  }
  return { costEur: cost(), promptTokens: promptTokens + cacheReadTokens + cacheWriteTokens, completionTokens, error: lastError };
}
