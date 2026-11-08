import { NextResponse } from 'next/server';
import { getRequestOrigin } from '@/lib/site-url';
import { leadSchema } from '@/lib/leads/schema';
import { receiveLead } from '@/lib/leads/service';
import { consumeRateLimit } from '@/lib/rate-limit';

// Réception des demandes des formulaires des sites publiés et de l'aperçu. Public (les visiteurs ne sont pas connectés) :
// validation stricte, champ piège anti-robot, limite par adresse et par site, CORS ouvert (le site publié est servi ailleurs).
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Accept' };

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

const page = (title: string, text: string) => new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>${title}</h1><p>${text}</p><p><a href="javascript:history.back()">Retour au site</a></p></body></html>`, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...cors } });

export async function POST(request: Request) {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const reply = (status: number, error: string, message: string) => wantsJson
    ? NextResponse.json({ error, message }, { status, headers: cors })
    : new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...cors } });
  const form = await request.formData().catch(() => null);
  if (!form) return reply(400, 'invalid_request', 'Demande illisible.');
  const parsed = leadSchema.safeParse(Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === 'string')));
  if (!parsed.success) return reply(422, 'invalid_request', 'Vérifiez votre nom, votre email et votre message, puis réessayez.');
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  if (!(await consumeRateLimit(`lead-ip:${ip}`, 8, 60 * 60 * 1000)) || !(await consumeRateLimit(`lead-site:${parsed.data.site}`, 60, 60 * 60 * 1000))) return reply(429, 'rate_limited', 'Trop de demandes pour le moment : réessayez plus tard ou appelez-nous.');
  const origin = getRequestOrigin(request);
  const result = await receiveLead(parsed.data, { inboxUrl: `${origin}/studio/${parsed.data.site}/requests` });
  if (!result.ok) return reply(404, 'unknown_site', 'Ce site n’existe plus.');
  return wantsJson ? NextResponse.json({ ok: true }, { status: 201, headers: cors }) : page('Merci !', 'Votre demande a bien été envoyée. Nous vous répondons rapidement.');
}
