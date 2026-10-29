import 'server-only';

import { systemPrompt } from '@/lib/ai/system-prompt';

export type CompletionMessage = { role: 'user' | 'assistant' | 'system'; content: string };

type StreamOptions = { signal: AbortSignal; model?: string };

export async function streamCompletion(messages: CompletionMessage[], options: StreamOptions): Promise<Response> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('ai_not_configured');

  return fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal: options.signal,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: options.model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, ...messages], stream: true }),
  });
}
