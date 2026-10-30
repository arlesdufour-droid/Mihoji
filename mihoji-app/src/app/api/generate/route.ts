import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCreditBalance } from '@/lib/billing/queries';
import { debitCredits } from '@/lib/billing/mutations';
import { assertProjectAccess, getSession } from '@/lib/auth';
import { aiRouter } from '@/lib/ai/router';
import { tokensToCredits } from '@/lib/ai/pricing';
import { persistChatVersion } from '@/lib/projects/persistence';
import { consumeRateLimit } from '@/lib/rate-limit';
import { isContentRefusal } from '@/lib/ai/providers/types';

const requestSchema = z.object({
  projectId: z.string().min(1),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(8_000) })).min(1).max(30),
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
  if (!session.isDemo) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
    if (!(await consumeRateLimit(`generate:${ip}`, 30, 60_000))) return jsonError('rate_limited', 429);
  }
  try {
    await assertProjectAccess(session, parsed.data.projectId);
  } catch (error) {
    if (error instanceof Error && error.message === 'project_not_found') return jsonError('project_not_found', 404);
    throw error;
  }
  const balance = await getCreditBalance(workspaceId);
  const taskLimit = parsed.data.task === 'plan' ? 2_000 : 4_000;
  const maxTokens = Math.min(taskLimit, balance.remaining);
  if (maxTokens < 16 && !session.isDemo) return jsonError('insufficient_credits', 402);

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 30_000);

  try {
    const encoder = new TextEncoder();
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let responseText = '';
    let isMock = !process.env.GROQ_API_KEY;
    const iterator = aiRouter.stream(parsed.data.task, parsed.data.messages, abortController.signal, maxTokens)[Symbol.asyncIterator]();
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
            promptTokens = chunk.promptTokens ?? promptTokens;
            completionTokens = chunk.completionTokens ?? completionTokens;
            totalTokens = chunk.totalTokens ?? ((promptTokens + completionTokens) || totalTokens);
            isMock ||= chunk.mock === true;
            if (chunk.content) controller.enqueue(encoder.encode(chunk.content));
            responseText += chunk.content ?? '';
            const nextChunk = await iterator.next();
            if (nextChunk.done) break;
            chunk = nextChunk.value;
          }
          if (!isMock) await debitCredits(workspaceId, tokensToCredits(totalTokens), 'chat');
          if (!session.isDemo) await persistChatVersion(parsed.data.projectId, parsed.data.messages.at(-1)?.content ?? '', responseText);
          controller.close();
        } catch (error) {
          if (!isMock && totalTokens > 0) await debitCredits(workspaceId, tokensToCredits(totalTokens), 'chat');
          console.error('AI generation stream failed.', error);
          if (isContentRefusal(error)) {
            controller.enqueue(encoder.encode('Je ne peux pas réaliser cette demande, car elle ne respecte pas les règles de sécurité. Aucun crédit n’a été débité.'));
            controller.close();
          } else if (error instanceof DOMException && error.name === 'AbortError') {
            controller.enqueue(encoder.encode('La génération a dépassé le délai autorisé. Les crédits consommés ont été débités.'));
            controller.close();
          } else {
            controller.error(error);
          }
        } finally {
          clearTimeout(timeout);
        }
      },
      cancel() {
        abortController.abort();
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', ...(session.isDemo || isMock ? { 'x-mihoji-mock': '1' } : {}) } });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return jsonError('ai_timeout', 504);
    if (isContentRefusal(error)) return jsonError('content_refused', 422);
    if (error instanceof Error && error.message === 'ai_not_configured') return jsonError('ai_not_configured', 503);
    return jsonError('ai_upstream_error', 502);
  }
}
