import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import type { CompletionRequest, CompletionResult, LlmProvider } from './types';
import { LlmProviderError } from './types';

let client: Anthropic | undefined;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new LlmProviderError('ai_not_configured', 503);
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2 });
  return client;
}

function toProviderError(error: unknown): never {
  if (error instanceof LlmProviderError) throw error;
  if (error instanceof Anthropic.APIError) {
    const retryAfter = Number(error.headers?.get?.('retry-after'));
    const retryAfterMs = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 120) * 1000 : undefined;
    const code = error instanceof Anthropic.RateLimitError ? 'rate_limit_exceeded'
      : error instanceof Anthropic.NotFoundError ? 'model_not_found'
        : error instanceof Anthropic.AuthenticationError ? 'ai_not_configured'
          : 'ai_upstream_error';
    throw new LlmProviderError(code, error.status, retryAfterMs);
  }
  throw error;
}

// Fournisseur Anthropic (modèle de design). Le prompt système est mis en cache : il est identique d'une génération à l'autre.
export class AnthropicProvider implements LlmProvider {
  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const system = req.messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n\n');
    const messages = req.messages.filter((message) => message.role !== 'system').map((message) => ({ role: message.role as 'user' | 'assistant', content: message.content }));
    try {
      // Flux + finalMessage : pas de délai d'attente HTTP sur les longues réponses JSON.
      // Repli côté serveur (« default ») si le modèle décline la demande par erreur.
      const stream = getClient().beta.messages.stream({
        model: req.model,
        max_tokens: req.maxTokens ?? 16_000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium' },
        ...(system ? { system: [{ type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } }] } : {}),
        messages,
      }, { signal: req.signal });
      const message = await stream.finalMessage();
      if (message.stop_reason === 'refusal') throw new LlmProviderError('refusal', 422);
      const content = message.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
      const usage = message.usage;
      const promptTokens = usage.input_tokens ?? 0;
      const completionTokens = usage.output_tokens ?? 0;
      const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
      const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
      return {
        content,
        promptTokens,
        completionTokens,
        cacheReadTokens,
        cacheWriteTokens,
        totalTokens: promptTokens + completionTokens + cacheReadTokens + cacheWriteTokens,
        model: message.model,
        truncated: message.stop_reason === 'max_tokens',
      };
    } catch (error) {
      toProviderError(error);
    }
  }

  async *stream(req: CompletionRequest) {
    const result = await this.complete(req);
    yield { content: result.content, totalTokens: result.totalTokens, promptTokens: result.promptTokens, completionTokens: result.completionTokens };
  }

  async listModels() {
    try {
      const models: string[] = [];
      for await (const model of getClient().models.list()) models.push(model.id);
      return models;
    } catch (error) {
      toProviderError(error);
    }
  }
}
