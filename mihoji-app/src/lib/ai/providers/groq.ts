import 'server-only';

import { systemPrompt } from '@/lib/ai/system-prompt';
import type { CompletionRequest, CompletionResult, LlmProvider } from './types';
import { LlmProviderError } from './types';

const endpoint = 'https://api.groq.com/openai/v1';

function requireApiKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new LlmProviderError('ai_not_configured', 503);
  return key;
}

async function responseError(response: Response): Promise<never> {
  const body = await response.text().catch(() => '');
  let code = 'ai_upstream_error';
  try {
    const parsed = JSON.parse(body) as { error?: { code?: string } };
    code = parsed.error?.code || code;
  } catch {
    // The provider may return a non-JSON error body.
  }
  throw new LlmProviderError(code, response.status);
}

export class GroqProvider implements LlmProvider {
  async *stream(req: CompletionRequest) {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      signal: req.signal,
      headers: { Authorization: `Bearer ${requireApiKey()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: req.model, messages: [{ role: 'system', content: systemPrompt }, ...req.messages], stream: true, stream_options: { include_usage: true }, ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}) }),
    });
    if (!response.ok || !response.body) await responseError(response);
    const body = response.body;
    if (!body) throw new LlmProviderError('ai_empty_response', 502);
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let remainder = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        remainder += decoder.decode(value, { stream: true });
        const lines = remainder.split('\n');
        remainder = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;
          const chunk = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }; x_groq?: { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } } };
          const usage = chunk.usage ?? chunk.x_groq?.usage;
          yield { content: chunk.choices?.[0]?.delta?.content, totalTokens: usage?.total_tokens, promptTokens: usage?.prompt_tokens, completionTokens: usage?.completion_tokens };
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      signal: req.signal,
      headers: { Authorization: `Bearer ${requireApiKey()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: req.model, messages: [{ role: 'system', content: systemPrompt }, ...req.messages], ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}) }),
    });
    if (!response.ok) await responseError(response);
    const data = await response.json() as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }; x_groq?: { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } } };
    const usage = data.usage ?? data.x_groq?.usage;
    return { content: data.choices?.[0]?.message?.content || '', totalTokens: usage?.total_tokens, promptTokens: usage?.prompt_tokens, completionTokens: usage?.completion_tokens };
  }

  async listModels() {
    const response = await fetch(`${endpoint}/models`, { headers: { Authorization: `Bearer ${requireApiKey()}` } });
    if (!response.ok) await responseError(response);
    const data = await response.json() as { data?: { id: string }[] };
    return data.data?.map((model) => model.id) || [];
  }
}
