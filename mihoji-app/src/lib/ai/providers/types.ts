export type CompletionMessage = { role: 'user' | 'assistant' | 'system'; content: string };
export type CompletionRequest = { model: string; messages: CompletionMessage[]; maxTokens?: number; signal?: AbortSignal; jsonMode?: boolean };
export type CompletionChunk = { content?: string; totalTokens?: number; promptTokens?: number; completionTokens?: number; mock?: boolean };
export type CompletionResult = { content: string; totalTokens?: number; promptTokens?: number; completionTokens?: number };

export interface LlmProvider {
  stream(req: CompletionRequest): AsyncIterable<CompletionChunk>;
  complete(req: CompletionRequest): Promise<CompletionResult>;
  listModels(): Promise<string[]>;
}

export class LlmProviderError extends Error {
  constructor(public readonly code: string, public readonly status?: number) {
    super(code);
    this.name = 'LlmProviderError';
  }
}

export function isContentRefusal(error: unknown) {
  return error instanceof LlmProviderError && ['content_filter', 'content_policy', 'safety_violation', 'refusal'].some((code) => error.code.toLowerCase().includes(code));
}
