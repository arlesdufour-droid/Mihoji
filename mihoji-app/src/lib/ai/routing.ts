import { LlmProviderError } from './providers/types';
import { defaultGroqModel } from './models';

// create / restyle : création du site et changement de style (modèle de design) ; edit : petites retouches de texte (modèle rapide).
export type AiTask = 'chat' | 'plan' | 'generate' | 'edit' | 'fix' | 'summarize' | 'create' | 'restyle';
export const designTasks = ['create', 'restyle'] as const;
export type DesignTask = (typeof designTasks)[number];

export const defaultDesignModel = 'claude-sonnet-5-5';

export function modelConfig(env: Partial<NodeJS.ProcessEnv> = process.env) {
  return {
    fast: env.AI_MODEL_FAST || 'openai/gpt-oss-20b',
    strong: env.AI_MODEL_STRONG || 'openai/gpt-oss-120b',
    fallback: env.AI_MODEL_FALLBACK || defaultGroqModel,
    design: env.AI_MODEL_DESIGN || defaultDesignModel,
  };
}

// Modèle Groq d'une tâche (les tâches de design y tombent sur le modèle fort, en repli).
export function selectModel(task: AiTask, config = modelConfig()) {
  return task === 'plan' || task === 'generate' || task === 'fix' || task === 'create' || task === 'restyle' ? config.strong : config.fast;
}

export type DesignRoute = { provider: 'anthropic' | 'groq' | 'mock'; model: string } | { provider: 'none'; error: 'ai_not_configured' };

// Fournisseur des tâches de design : Anthropic si la clé est là, sinon le modèle fort de Groq ;
// sans aucune clé, simulation en développement et erreur explicite en production (jamais de simulation en production).
export function designRoute(env: Partial<NodeJS.ProcessEnv> = process.env): DesignRoute {
  const config = modelConfig(env);
  const production = env.NODE_ENV === 'production' || env.APP_ENV === 'production';
  if (env.AI_MOCK === '1' && !production) return { provider: 'mock', model: 'simulation' };
  if (env.ANTHROPIC_API_KEY) return { provider: 'anthropic', model: config.design };
  if (env.GROQ_API_KEY) return { provider: 'groq', model: config.strong };
  if (production) return { provider: 'none', error: 'ai_not_configured' };
  return { provider: 'mock', model: 'simulation' };
}

export function shouldFallback(error: unknown) {
  return error instanceof LlmProviderError && (error.code === 'model_decommissioned' || error.code === 'model_not_found' || (error.status !== undefined && error.status >= 500));
}
