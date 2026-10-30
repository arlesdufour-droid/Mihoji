import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCreditBalance } from '@/lib/billing/queries';
import { debitCredits } from '@/lib/billing/mutations';
import { assertProjectAccess, getSession } from '@/lib/auth';
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
  try {
    await assertProjectAccess(session, parsed.data.projectId);
  } catch (error) {
    if (error instanceof Error && error.message === 'project_not_found') return jsonError('project_not_found', 404);
    throw error;
  }
  const balance = await getCreditBalance(workspaceId);
  if (balance.remaining <= 0 && process.env.NODE_ENV !== 'development') return jsonError('insufficient_credits', 402);

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 30_000);

  try {
    const encoder = new TextEncoder();
    let totalTokens = 0;
    let isMock = !process.env.GROQ_API_KEY;
    const iterator = aiRouter.stream(parsed.data.task, parsed.data.messages, abortController.signal)[Symbol.asyncIterator]();
    const firstChunk = await iterator.next();
    isMock ||= firstChunk.value?.mock === true;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (firstChunk.done) {
            if (!isMock) await debitCredits(workspaceId, tokensToCredits(totalTokens), 'chat');
            controller.close();
            return;
          }
          let chunk = firstChunk.value;
          while (chunk) {
            totalTokens = chunk.totalTokens ?? totalTokens;
            isMock ||= chunk.mock === true;
            if (chunk.content) controller.enqueue(encoder.encode(chunk.content));
            const nextChunk = await iterator.next();
            if (nextChunk.done) break;
            chunk = nextChunk.value;
          }
          if (!isMock) await debitCredits(workspaceId, tokensToCredits(totalTokens), 'chat');
          controller.close();
        } catch (error) {
          console.warn('AI generation stream failed.', error);
          controller.error(error);
        }
      },
      cancel() {
        abortController.abort();
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', ...(session.isDemo || isMock ? { 'x-mihoji-mock': '1' } : {}) } });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return jsonError('ai_timeout', 504);
    if (error instanceof Error && error.message === 'ai_not_configured') return jsonError('ai_not_configured', 503);
    return jsonError('ai_upstream_error', 502);
  } finally {
    clearTimeout(timeout);
  }
}
