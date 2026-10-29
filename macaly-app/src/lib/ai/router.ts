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
  constructor(private readonly provider: LlmProvider = process.env.GROQ_API_KEY ? new GroqProvider() : new MockProvider()) {}

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

  async *stream(task: AiTask, messages: CompletionMessage[], signal: AbortSignal) {
    const config = modelConfig();
    let model = selectModel(task, config);
    try {
      const models = await availableModels(this.provider);
      if (!models.includes(model)) {
        console.error(`Configured AI model "${model}" is unavailable; using fallback "${config.fallback}".`);
        model = config.fallback;
      }
      yield* this.provider.stream({ model, messages, signal });
    } catch (error) {
      if (!shouldFallback(error) || model === config.fallback) throw error;
      console.error(`AI model "${model}" failed; retrying with fallback "${config.fallback}".`);
      yield* this.provider.stream({ model: config.fallback, messages, signal });
    }
  }
}

export const aiRouter = new AiRouter();
