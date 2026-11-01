import 'server-only';

import { GroqProvider } from '@/lib/ai/providers/groq';
import { MockProvider } from '@/lib/ai/providers/mock';
import type { CompletionMessage, LlmProvider } from '@/lib/ai/providers/types';
import { modelConfig, selectModel, shouldFallback, type AiTask } from '@/lib/ai/routing';

export type AiStatus = { model: string; available: boolean; checkedAt: string };

const cacheDuration = 60 * 60 * 1000;
let availability: { models: string[]; checkedAt: number } | undefined;

export { modelConfig, selectModel, shouldFallback };
export type { AiTask } from '@/lib/ai/routing';

async function availableModels(provider: LlmProvider) {
  if (availability && Date.now() - availability.checkedAt < cacheDuration) return availability.models;
  const models = await provider.listModels();
  availability = { models, checkedAt: Date.now() };
  return models;
}

export function resetModelCache() {
  availability = undefined;
}

export class AiRouter {
  constructor(
    private readonly provider: LlmProvider = process.env.GROQ_API_KEY && process.env.AI_MOCK !== '1' ? new GroqProvider() : new MockProvider(),
    private readonly mockProvider: LlmProvider = new MockProvider(),
  ) {}

  async getStatus(): Promise<AiStatus[]> {
    const config = modelConfig();
    const checkedAt = new Date().toISOString();
    try {
      const models = await availableModels(this.provider);
      return [config.fast, config.strong, config.fallback].filter((model, index, list) => list.indexOf(model) === index).map((model) => ({ model, available: models.includes(model), checkedAt }));
    } catch (error) {
      console.error('AI model availability check failed.', error);
      return [config.fast, config.strong, config.fallback].filter((model, index, list) => list.indexOf(model) === index).map((model) => ({ model, available: false, checkedAt }));
    }
  }

  async *stream(task: AiTask, messages: CompletionMessage[], signal: AbortSignal, maxTokens?: number, jsonMode = false) {
    const config = modelConfig();
    let model = selectModel(task, config);
    if ((!process.env.GROQ_API_KEY || process.env.AI_MOCK === '1') && process.env.NODE_ENV !== 'production') {
      console.warn(`Groq model "${model}" is not configured; using simulated response in development.`);
    }
    try {
      const models = await availableModels(this.provider);
      if (!models.includes(model)) {
        console.error(`Configured AI model "${model}" is unavailable; using fallback "${config.fallback}".`);
        model = config.fallback;
      }
      yield* this.provider.stream({ model, messages, signal, maxTokens, jsonMode });
    } catch (error) {
      if ((!process.env.GROQ_API_KEY || process.env.AI_MOCK === '1') && process.env.NODE_ENV !== 'production') {
        console.warn(`Groq model "${model}" failed; using simulated response in development.`, error);
        yield* this.mockProvider.stream({ model: config.fallback, messages, signal, maxTokens });
        return;
      }
      if (!shouldFallback(error) || model === config.fallback) throw error;
      console.warn(`AI model "${model}" failed; retrying with fallback "${config.fallback}".`);
      yield* this.provider.stream({ model: config.fallback, messages, signal, maxTokens, jsonMode });
    }
  }

  async *streamJson(task: AiTask, messages: CompletionMessage[], signal: AbortSignal, maxTokens?: number) {
    yield* this.stream(task, messages, signal, maxTokens, true);
  }
}

export const aiRouter = new AiRouter();
