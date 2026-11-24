// Pages d'état d'un site publié (pures, sans script, sans dépendance) : indisponible (dépublié ou bloqué) et introuvable.

const shell = (title: string, heading: string, text: string) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f6f8;color:#16161d;font:16px/1.55 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:30rem;padding:2rem 1.5rem;text-align:center}h1{font-size:1.55rem;margin:0 0 .75rem}p{margin:.4rem 0;color:#4b4b57}.mark{width:3rem;height:3rem;margin:0 auto 1.25rem;border-radius:50%;background:#e6e6ec;display:grid;place-items:center;font-size:1.4rem}</style></head><body><main><div class="mark" aria-hidden="true">⏸</div><h1>${heading}</h1><p>${text}</p></main></body></html>`;

export function unavailablePageHtml(): string {
  return shell('Site indisponible', 'Ce site est indisponible', 'Il n’est pas accessible pour le moment. Merci de réessayer plus tard.');
}

export function notFoundPageHtml(): string {
  return shell('Page introuvable', 'Page introuvable', 'Cette adresse ne correspond à aucun site, ou la page demandée n’existe pas.');
}
