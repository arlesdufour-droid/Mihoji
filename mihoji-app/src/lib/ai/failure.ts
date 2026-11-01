export const GENERATION_FAILED_MESSAGE = 'Je n’ai pas pu appliquer cette modification. Pouvez-vous reformuler ?';
export const GENERATION_SCOPE_FAILED_MESSAGE = 'Je n’ai rien modifié : je n’ai pas réussi à appliquer cette demande sans toucher à d’autres parties de votre site. Pouvez-vous préciser ce que vous voulez changer ?';
export const SERVICE_UNAVAILABLE_MESSAGE = 'Le service IA est momentanément indisponible.';
export const INSUFFICIENT_CREDITS_MESSAGE = 'Crédits insuffisants. Achetez des crédits ou changez de formule.';
export const RATE_LIMITED_MESSAGE = 'L’assistant est très sollicité, réessayez dans une minute.';
export const MESSAGE_TOO_LONG_MESSAGE = 'Votre message est trop long. Raccourcissez-le et réessayez.';

export const RETRY_FEEDBACK_PREFIX = 'Modification annulée';

const FAILURE_MESSAGES = new Set([
  GENERATION_FAILED_MESSAGE,
  GENERATION_SCOPE_FAILED_MESSAGE,
  SERVICE_UNAVAILABLE_MESSAGE,
  INSUFFICIENT_CREDITS_MESSAGE,
  RATE_LIMITED_MESSAGE,
  MESSAGE_TOO_LONG_MESSAGE,
]);

type Message = { role: 'user' | 'assistant'; content: string };

export function isFailureMessage(content: string): boolean {
  return FAILURE_MESSAGES.has(content.trim());
}

// Une demande échouée n'a rien changé : on la retire de l'historique envoyé au modèle, avec sa réponse d'échec,
// pour qu'elle ne soit pas reprise dans les générations suivantes.
export function dropFailedExchanges<T extends Message>(messages: T[]): T[] {
  const kept: T[] = [];
  for (const message of messages) {
    if (message.role === 'assistant' && isFailureMessage(message.content)) {
      if (kept.at(-1)?.role === 'user') kept.pop();
      continue;
    }
    kept.push(message);
  }
  return kept;
}
