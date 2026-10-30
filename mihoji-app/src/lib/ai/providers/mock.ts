import type { CompletionRequest, CompletionResult, LlmProvider } from './types';

const mockText = 'Mihoji a préparé une réponse de démonstration. Décrivez une modification pour continuer.';

export class MockProvider implements LlmProvider {
  async *stream(req: CompletionRequest) {
    void req;
    yield { content: mockText, totalTokens: 24, promptTokens: 12, completionTokens: 12, mock: true };
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    void req;
    return { content: mockText, totalTokens: 24, promptTokens: 12, completionTokens: 12 };
  }

  async listModels() {
    return ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b'];
  }
}
