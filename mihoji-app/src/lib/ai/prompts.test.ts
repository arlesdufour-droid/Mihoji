import { describe, expect, it } from 'vitest';
import { chatProtocolPrompt, retryFeedbackMessage } from './chat-plan';
import { RETRY_FEEDBACK_PREFIX } from './failure';
import { systemPrompt } from './system-prompt';

describe('prompts de génération', () => {
  it('exige des contenus plausibles pour le métier', () => {
    expect(chatProtocolPrompt).toContain('plausibles pour le métier');
    expect(chatProtocolPrompt).toContain('pas de croissant dans une liste de « pains »');
    expect(systemPrompt).toContain('plausibles pour le métier');
  });

  it('impose de ne modifier que ce que la demande vise, avec un balisage valide et lisible', () => {
    expect(chatProtocolPrompt).toContain('Ne modifie QUE ce que la demande vise');
    expect(chatProtocolPrompt).toContain('balisage HTML valide');
    expect(chatProtocolPrompt).toContain('WCAG AA');
  });

  it('formule un retour de réessai reconnaissable', () => {
    expect(retryFeedbackMessage('raison')).toMatch(new RegExp(`^${RETRY_FEEDBACK_PREFIX} : raison`));
  });
});
