export type CompletionMessage = { role: 'user' | 'assistant' | 'system'; content: string };
export type CompletionRequest = { model: string; messages: CompletionMessage[]; signal?: AbortSignal };
export type CompletionChunk = { content?: string; totalTokens?: number };
export type CompletionResult = { content: string; totalTokens?: number };

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
