import { LlmProviderError } from './providers/types';
import { defaultGroqModel } from './models';

export type AiTask = 'chat' | 'plan' | 'generate' | 'edit' | 'fix' | 'summarize';

export function modelConfig(env: Partial<NodeJS.ProcessEnv> = process.env) {
  return {
    fast: env.AI_MODEL_FAST || 'openai/gpt-oss-20b',
    strong: env.AI_MODEL_STRONG || 'openai/gpt-oss-120b',
    fallback: env.AI_MODEL_FALLBACK || defaultGroqModel,
  };
}

export function selectModel(task: AiTask, config = modelConfig()) {
  return task === 'plan' || task === 'generate' || task === 'fix' ? config.strong : config.fast;
}

export function shouldFallback(error: unknown) {
  return error instanceof LlmProviderError && (error.code === 'model_decommissioned' || error.code === 'model_not_found' || (error.status !== undefined && error.status >= 500));
}
