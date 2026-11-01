import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { companies, fileBlobs, projectFiles } from '@/db/schema';
import { injectCompanyData } from '@/lib/company/render';
import { getCreditBalance } from '@/lib/billing/queries';
import { debitCredits } from '@/lib/billing/mutations';
import { assertProjectAccess, getSession, type AppSession } from '@/lib/auth';
import { aiRouter } from '@/lib/ai/router';
import { tokensToCredits } from '@/lib/ai/pricing';
import { persistChatOperations } from '@/lib/projects/persistence';
import { consumeRateLimit } from '@/lib/rate-limit';
import { isContentRefusal, isRateLimitError, type CompletionMessage } from '@/lib/ai/providers/types';
import { chatProtocolPrompt, parseChatPlan, retryFeedbackMessage } from '@/lib/ai/chat-plan';
import { dropFailedExchanges, GENERATION_FAILED_MESSAGE, GENERATION_SCOPE_FAILED_MESSAGE } from '@/lib/ai/failure';
import { keywordsOf } from '@/lib/ai/keywords';

const requestSchema = z.object({
  projectId: z.string().min(1),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(8_000) })).min(1).max(30),
  task: z.enum(['chat', 'plan', 'generate', 'edit', 'fix', 'summarize']).default('chat'),
});

type ParsedRequest = z.infer<typeof requestSchema>;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}


function fileScore(path: string, content: string, keywords: string[]): number {
  const haystack = `${path}\n${content}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return keywords.reduce((score, keyword) => score + (haystack.includes(keyword) ? 1 : 0), 0);
}

// N'envoie au modèle que les fichiers utiles à la demande, pour limiter les tokens (limite Groq : 8 000 tokens/min).
async function currentFilesMessage(projectId: string, workspaceId: string, prompt: string): Promise<string> {
  const [company] = await getDb().select().from(companies).where(eq(companies.workspaceId, workspaceId)).limit(1);
  const context = company ? `Contexte entreprise : ${injectCompanyData('{{company.name}}, activité : {{company.activity}}', company)}.\nTout contenu ajouté doit être cohérent avec cette activité et avec la demande (une liste de « pains » ne contient que des pains, jamais de viennoiserie).\n` : '';
  const rows = await getDb().select({ path: projectFiles.path, content: fileBlobs.content }).from(projectFiles).innerJoin(fileBlobs, eq(projectFiles.hash, fileBlobs.hash)).where(eq(projectFiles.projectId, projectId));
  if (rows.length === 0) return 'Fichiers actuels : (aucun)';
  const keywords = keywordsOf(prompt);
  const ranked = rows.map((row) => ({ ...row, score: fileScore(row.path, row.content, keywords) })).sort((a, b) => b.score - a.score);
  // Toujours inclure la page principale ; sans correspondance, au moins le premier fichier.
  const selected = ranked.filter((row) => row.score > 0 || row.path === 'index.html');
  if (selected.length === 0) selected.push(ranked[0]);
  const omitted = rows.length - selected.length;
  const files = selected.map((row) => `--- ${row.path} ---\n${row.content}`).join('\n');
  const note = omitted > 0 ? `\n(${omitted} autre(s) fichier(s) non montré(s), sans rapport avec la demande : ${ranked.filter((row) => !selected.includes(row)).map((row) => row.path).join(', ')}. Si nécessaire, crée ou modifie-les par leur chemin.)` : '';
  return `Fichiers actuels :\n${context}${files.slice(0, 12_000)}${note}`;
}

async function collectStream(task: ParsedRequest['task'], messages: CompletionMessage[], signal: AbortSignal, maxTokens: number, jsonMode = false) {
  let totalTokens = 0;
  let text = '';
  let isMock = !process.env.GROQ_API_KEY || process.env.AI_MOCK === '1';
  const source = jsonMode ? aiRouter.streamJson(task, messages, signal, maxTokens) : aiRouter.stream(task, messages, signal, maxTokens);
  for await (const chunk of source) {
    isMock ||= chunk.mock === true;
    text += chunk.content ?? '';
    totalTokens = chunk.totalTokens ?? (((chunk.promptTokens ?? 0) + (chunk.completionTokens ?? 0)) || totalTokens);
  }
  return { text, totalTokens, isMock };
}

async function handleChat(session: AppSession, workspaceId: string, parsed: ParsedRequest, signal: AbortSignal, maxTokens: number) {
  const history = dropFailedExchanges(parsed.messages);
  const prompt = history.at(-1)?.content ?? '';
  const baseMessages: CompletionMessage[] = session.isDemo
    ? history
    : [{ role: 'system', content: chatProtocolPrompt }, ...history, { role: 'user', content: await currentFilesMessage(parsed.projectId, workspaceId, prompt) }];
  if (session.isDemo) {
    const { text } = await collectStream('chat', baseMessages, signal, maxTokens);
    return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'x-mihoji-changed': '0', 'x-mihoji-mock': '1' } });
  }

  let text = '';
  let totalTokens = 0;
  let isMock = !process.env.GROQ_API_KEY || process.env.AI_MOCK === '1';
  let plan = null as ReturnType<typeof parseChatPlan>;
  let result: Awaited<ReturnType<typeof persistChatOperations>> = { changed: false };
  let succeeded = false;
  let rejectedForScope = false;
  let feedback: string | null = null;
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    // Le retour des contrôles qualité précède les fichiers : le dernier message reste toujours « Fichiers actuels ».
    const messages: CompletionMessage[] = feedback
      ? [...baseMessages.slice(0, -1), { role: 'user', content: feedback }, baseMessages[baseMessages.length - 1]]
      : baseMessages;
    let collected: Awaited<ReturnType<typeof collectStream>>;
    try {
      collected = await collectStream('chat', messages, signal, maxTokens, true);
    } catch (error) {
      // Respecte l'en-tête retry-after de Groq avant le second essai.
      const retryAfterMs = isRateLimitError(error) ? error.retryAfterMs : undefined;
      if (attempt === 1 && retryAfterMs && retryAfterMs <= 25_000) {
        console.warn(`Limite Groq atteinte, nouvel essai dans ${Math.ceil(retryAfterMs / 1000)} s.`);
        await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
        continue;
      }
      throw error;
    }
    text = collected.text;
    totalTokens += collected.totalTokens;
    isMock ||= collected.isMock;
    plan = parseChatPlan(text);
    if (!plan) {
      console.error('Chat plan parsing failed.', { attempt, rawResponse: text.slice(0, 2000) });
      feedback = retryFeedbackMessage('la réponse n’était pas un objet JSON valide au format demandé.');
      continue;
    }
    // Au dernier essai, on accepte une application partielle (décrite honnêtement) plutôt que de tout perdre.
    result = await persistChatOperations(parsed.projectId, prompt, plan, { strict: attempt < maxAttempts });
    if (!result.changed && result.rejected) {
      console.warn('Chat modification rejected by quality checks.', { attempt, reason: result.rejected });
      rejectedForScope = true;
      feedback = retryFeedbackMessage(result.rejected);
      continue;
    }
    rejectedForScope = false;
    if (result.changed || plan.operations.length === 0) {
      succeeded = true;
      break;
    }
    console.error('Chat plan operations not applied.', { attempt, operations: plan.operations.length, rawResponse: text.slice(0, 2000) });
    feedback = retryFeedbackMessage('aucune opération n’a pu être appliquée : l’extrait « search » doit apparaître exactement dans le fichier.');
  }
  if (!succeeded) {
    console.error('Chat generation failed after retries.', { rawResponse: text.slice(0, 2000) });
  } else if (!isMock && totalTokens > 0) {
    await debitCredits(workspaceId, tokensToCredits(totalTokens), 'chat');
  }
  let summary = succeeded ? plan!.summary.trim() || 'C’est fait.' : rejectedForScope ? GENERATION_SCOPE_FAILED_MESSAGE : GENERATION_FAILED_MESSAGE;
  if (succeeded && result.changed) {
    // Le résumé ne doit décrire que ce qui a réellement été fait.
    if (result.skipped > 0) summary = `Je n’ai pu appliquer qu’une partie de votre demande (${result.applied} modification${result.applied > 1 ? 's' : ''} sur ${result.applied + result.skipped}). Vérifiez l’aperçu et précisez ce qui manque.`;
    if (result.notes.length > 0) summary = `${summary} ${result.notes.join(' ')}`;
  }
  return new Response(summary, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'x-mihoji-changed': result.changed ? '1' : '0',
      ...(result.changed ? { 'x-mihoji-files': result.files.join(',') } : {}),
      ...(isMock ? { 'x-mihoji-mock': '1' } : {}),
    },
  });
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
    if (parsed.data.task === 'chat') {
      const chatResponse = await handleChat(session, workspaceId, parsed.data, abortController.signal, maxTokens);
      clearTimeout(timeout);
      return chatResponse;
    }

    const encoder = new TextEncoder();
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let isMock = !process.env.GROQ_API_KEY || process.env.AI_MOCK === '1';
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
            const nextChunk = await iterator.next();
            if (nextChunk.done) break;
            chunk = nextChunk.value;
          }
          if (!isMock) await debitCredits(workspaceId, tokensToCredits(totalTokens), 'chat');
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
    clearTimeout(timeout);
    if (error instanceof DOMException && error.name === 'AbortError') return jsonError('ai_timeout', 504);
    if (isContentRefusal(error)) return jsonError('content_refused', 422);
    if (isRateLimitError(error)) return jsonError('ai_rate_limited', 429);
    if (error instanceof Error && error.message === 'ai_not_configured') return jsonError('ai_not_configured', 503);
    console.error('AI generation failed.', error);
    return jsonError('ai_upstream_error', 502);
  }
}
