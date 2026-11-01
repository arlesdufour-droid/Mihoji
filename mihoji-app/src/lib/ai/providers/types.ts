export type CompletionMessage = { role: 'user' | 'assistant' | 'system'; content: string };
// rawSystem : n'ajoute pas le prompt système générique du fournisseur (les tâches de design ont le leur).
export type CompletionRequest = { model: string; messages: CompletionMessage[]; maxTokens?: number; signal?: AbortSignal; jsonMode?: boolean; rawSystem?: boolean };
export type CompletionChunk = { content?: string; totalTokens?: number; promptTokens?: number; completionTokens?: number; mock?: boolean };
export type CompletionResult = {
  content: string;
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  // Jetons lus / écrits dans le cache de prompt (Anthropic), facturés à un tarif différent.
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  // Modèle ayant réellement répondu (peut différer en cas de repli côté fournisseur).
  model?: string;
  // La réponse a été coupée par la limite de jetons.
  truncated?: boolean;
  mock?: boolean;
};

export interface LlmProvider {
  stream(req: CompletionRequest): AsyncIterable<CompletionChunk>;
  complete(req: CompletionRequest): Promise<CompletionResult>;
  listModels(): Promise<string[]>;
}

export class LlmProviderError extends Error {
  constructor(public readonly code: string, public readonly status?: number, public readonly retryAfterMs?: number) {
    super(code);
    this.name = 'LlmProviderError';
  }
}

export function isContentRefusal(error: unknown) {
  return error instanceof LlmProviderError && ['content_filter', 'content_policy', 'safety_violation', 'refusal'].some((code) => error.code.toLowerCase().includes(code));
}

export function isRateLimitError(error: unknown): error is LlmProviderError {
  return error instanceof LlmProviderError && (error.status === 429 || error.code === 'rate_limit_exceeded');
}
