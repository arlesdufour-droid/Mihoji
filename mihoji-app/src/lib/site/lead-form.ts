// Formulaires des sites : devis et contact envoyés au serveur de Mihoji (plus de mailto), stockés et notifiés par email.
// Le jeton {{site.id}} est remplacé par l'identifiant du projet à l'aperçu et à la publication ; l'action est rendue absolue à la publication.

export const LEADS_PATH = '/api/public/leads';
export type LeadKind = 'quote' | 'contact';

export function leadFormOpen(kind: LeadKind): string {
  return `<form class="form" method="post" action="${LEADS_PATH}" data-lead="${kind}"><input type="hidden" name="site" value="{{site.id}}"><input type="hidden" name="kind" value="${kind}"><div class="lead-hp" aria-hidden="true"><label>Ne pas remplir<input name="website" tabindex="-1" autocomplete="off"></label></div>`;
}

// Aucun JavaScript : le formulaire s'envoie nativement et le serveur répond par une page de remerciement (règle du projet : sites sans script).
export const leadFormNote = '<p class="form-note">Vos informations ne servent qu’à répondre à votre demande.</p>';

// À la publication, le site est servi ailleurs que par l'application : l'action du formulaire devient une adresse absolue.
export function absolutizeLeadActions(html: string, origin: string): string {
  return html.replaceAll(`action="${LEADS_PATH}"`, `action="${origin}${LEADS_PATH}"`).replaceAll('action="/api/public/bookings"', `action="${origin}/api/public/bookings"`);
}

export function injectSiteId(html: string, projectId: string): string {
  return html.replaceAll('{{site.id}}', projectId);
}
