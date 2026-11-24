import { VITRINE_NOTICE } from '@/lib/vitrine/cases';

// Les formulaires des sites d'exemple mènent ici : l'entreprise est fictive, rien n'est envoyé ni enregistré.
const page = () => new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Site d’exemple</title></head><body style="font-family:system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1.25rem;line-height:1.55;color:#16161d"><h1 style="font-size:1.6rem">Ceci est un site d’exemple</h1><p>${VITRINE_NOTICE}. Votre message n’a pas été envoyé et rien n’a été enregistré.</p><p>Avec votre propre site Mihoji, ce formulaire vous envoie de vraies demandes par email et les range dans votre espace.</p><p><a href="/login?intent=business" target="_top" style="display:inline-block;background:#4f46e5;color:#fff;padding:.7rem 1.1rem;border-radius:.6rem;text-decoration:none;font-weight:600">Créer mon site</a></p></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

export const GET = page;
export const POST = page;
