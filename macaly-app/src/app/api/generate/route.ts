import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCreditBalance } from '@/lib/billing/queries';
import { debitCredits } from '@/lib/billing/mutations';
import { getSession } from '@/lib/auth';
import { aiRouter } from '@/lib/ai/router';
import { tokensToCredits } from '@/lib/ai/pricing';

const requestSchema = z.object({
  projectId: z.string().min(1),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1) })).min(1),
  task: z.enum(['chat', 'plan', 'generate', 'edit', 'fix', 'summarize']).default('chat'),
});

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('invalid_request', 400);

  const session = await getSession();
  if (!session) return jsonError('unauthorized', 401);
  const workspaceId = session.workspaceId;
  const balance = await getCreditBalance(workspaceId);
  if (balance.remaining <= 0) return jsonError('insufficient_credits', 402);

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 30_000);

  try {
    const encoder = new TextEncoder();
    let totalTokens = 0;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of aiRouter.stream(parsed.data.task, parsed.data.messages, abortController.signal)) {
            totalTokens = chunk.totalTokens ?? totalTokens;
            if (chunk.content) controller.enqueue(encoder.encode(chunk.content));
          }
          await debitCredits(workspaceId, tokensToCredits(totalTokens), 'chat');
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
      cancel() {
        abortController.abort();
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', ...(session.isDemo ? { 'x-mihoji-mock': '1' } : {}) } });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return jsonError('ai_timeout', 504);
    if (error instanceof Error && error.message === 'ai_not_configured') return jsonError('ai_not_configured', 503);
    return jsonError('ai_upstream_error', 502);
  } finally {
    clearTimeout(timeout);
  }
}
