import { describe, expect, it } from 'vitest';
import { dropFailedExchanges, GENERATION_FAILED_MESSAGE, SERVICE_UNAVAILABLE_MESSAGE } from './failure';

describe('dropFailedExchanges', () => {
  it('retire la demande échouée et sa réponse d’échec', () => {
    const messages = [
      { role: 'user' as const, content: 'Ajoute un blog' },
      { role: 'assistant' as const, content: GENERATION_FAILED_MESSAGE },
      { role: 'user' as const, content: 'Ajoute des horaires' },
      { role: 'assistant' as const, content: 'J’ai ajouté les horaires.' },
      { role: 'user' as const, content: 'Mets les titres en bleu' },
      { role: 'assistant' as const, content: SERVICE_UNAVAILABLE_MESSAGE },
      { role: 'user' as const, content: 'Change la couleur du fond' },
    ];
    expect(dropFailedExchanges(messages).map((message) => message.content)).toEqual(['Ajoute des horaires', 'J’ai ajouté les horaires.', 'Change la couleur du fond']);
  });

  it('conserve un historique sans échec', () => {
    const messages = [{ role: 'user' as const, content: 'Bonjour' }, { role: 'assistant' as const, content: 'Bonjour !' }];
    expect(dropFailedExchanges(messages)).toEqual(messages);
  });
});
