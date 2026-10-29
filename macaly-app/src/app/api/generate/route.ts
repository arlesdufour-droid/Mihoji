import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCreditBalance } from '@/lib/billing/queries';
import { debitCredits } from '@/lib/billing/mutations';
import { streamCompletion } from '@/lib/ai/groq';
import { tokensToCredits } from '@/lib/ai/pricing';

const requestSchema = z.object({
  projectId: z.string().min(1),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1) })).min(1),
});

const mockResponse = `I drafted a polished Mihoji starter for your request.\n\n- Responsive layout with a clear hierarchy\n- Tailwind-ready components\n- A preview is ready in the workspace\n\n<div class="rounded-2xl bg-slate-900 p-8 text-white"><p class="text-xs uppercase tracking-[0.2em] text-indigo-300">Mihoji demo</p><h1 class="mt-3 text-3xl font-bold">Your generated experience</h1><p class="mt-2 text-slate-400">Describe a change and I will update the preview.</p></div>`;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('invalid_request', 400);

  const workspaceId = 'demo-workspace';
  const balance = await getCreditBalance(workspaceId);
  if (balance.remaining <= 0) return jsonError('insufficient_credits', 402);

  if (!process.env.GROQ_API_KEY) {
    if (process.env.NODE_ENV === 'production') return jsonError('ai_not_configured', 503);
    if (!globalThis.__mihojiMockWarned) {
      console.warn('Mihoji AI mock mode enabled because GROQ_API_KEY is missing.');
      globalThis.__mihojiMockWarned = true;
    }
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const chunk of mockResponse.match(/.{1,48}(?:\s|$)/g) || [mockResponse]) {
          controller.enqueue(encoder.encode(chunk));
          await new Promise((resolve) => setTimeout(resolve, 18));
        }
        controller.close();
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'x-mihoji-mock': '1' } });
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 30_000);

  try {
    const upstream = await streamCompletion(parsed.data.messages, { signal: abortController.signal });
    if (!upstream.ok || !upstream.body) {
      if (upstream.status === 429) return jsonError('groq_rate_limited', 429);
      return jsonError('ai_upstream_error', 502);
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let remainder = '';
    let totalTokens = 0;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          await debitCredits(workspaceId, tokensToCredits(totalTokens), 'chat');
          controller.close();
          return;
        }
        remainder += decoder.decode(value, { stream: true });
        const lines = remainder.split('\n');
        remainder = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          const chunk = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[]; usage?: { total_tokens?: number } };
          totalTokens = chunk.usage?.total_tokens ?? totalTokens;
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) controller.enqueue(encoder.encode(content));
        }
      },
      cancel() {
        void reader.cancel();
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return jsonError('ai_timeout', 504);
    if (error instanceof Error && error.message === 'ai_not_configured') return jsonError('ai_not_configured', 503);
    return jsonError('ai_upstream_error', 502);
  } finally {
    clearTimeout(timeout);
  }
}

declare global {
  var __mihojiMockWarned: boolean | undefined;
}
