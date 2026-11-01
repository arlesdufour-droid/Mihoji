import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { cityOf } from '@/lib/company/render';
import { LlmProviderError } from '@/lib/ai/providers/types';
import { generationById, generationSite, runDesignGeneration } from '@/lib/site/design-service';
import { styleIds } from '@/lib/site/schema';

// Une création complète par le modèle de design peut prendre une à deux minutes.
export const maxDuration = 300;

const companySchema = z.object({
  name: z.string().trim().min(1).max(120),
  activity: z.string().trim().max(160).default(''),
  address: z.string().trim().max(240).default(''),
  phone: z.string().trim().max(40).default(''),
  email: z.string().trim().max(160).default(''),
});

const requestSchema = z.discriminatedUnion('task', [
  z.object({ task: z.literal('create'), request: z.string().trim().min(8).max(2_000), company: companySchema, trade: z.string().trim().max(80).optional(), style: z.enum(styleIds).optional() }),
  z.object({ task: z.literal('restyle'), request: z.string().trim().min(3).max(500), generationId: z.string() }),
]);

// Laboratoire de génération (administrateurs) : création d'un site ou changement de style par le modèle de design.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const body = parsed.data;
  // Session de démonstration : pas d'espace ni d'utilisateur réels à rattacher.
  const owner = session.isDemo ? { workspaceId: null, userId: null } : { workspaceId: session.workspaceId, userId: session.user.id };
  try {
    if (body.task === 'create') {
      const company = { ...body.company, city: cityOf(body.company.address), hasPhone: Boolean(body.company.phone), hasEmail: Boolean(body.company.email) };
      const record = await runDesignGeneration({ task: 'create', request: body.request, trade: body.trade, style: body.style, company, ...owner }, request.signal);
      return NextResponse.json({ id: record.id, status: record.status, error: record.error, costEur: record.shadowCostEur, model: record.model });
    }
    const source = await generationById(body.generationId);
    const site = source && generationSite(source);
    if (!source || !site) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const record = await runDesignGeneration({ task: 'restyle', request: body.request, site, company: source.company as never, ...owner }, request.signal);
    return NextResponse.json({ id: record.id, status: record.status, error: record.error, costEur: record.shadowCostEur, model: record.model });
  } catch (error) {
    if (error instanceof LlmProviderError && error.code === 'ai_not_configured') return NextResponse.json({ error: 'ai_not_configured' }, { status: 503 });
    throw error;
  }
}
