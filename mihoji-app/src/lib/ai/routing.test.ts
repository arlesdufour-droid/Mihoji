import { describe, expect, it } from 'vitest';
import { designRoute, modelConfig, selectModel } from './routing';

describe('AI task routing', () => {
  it('uses the strong model for generation work', () => {
    const config = modelConfig({});
    expect(selectModel('generate', config)).toBe('openai/gpt-oss-120b');
    expect(selectModel('fix', config)).toBe('openai/gpt-oss-120b');
  });

  it('uses the fast model for conversation work', () => {
    const config = modelConfig({});
    expect(selectModel('chat', config)).toBe('openai/gpt-oss-20b');
    expect(selectModel('summarize', config)).toBe('openai/gpt-oss-20b');
  });
});

describe('routage des tâches de design', () => {
  it('confie la création et le changement de style au modèle de design Anthropic quand la clé est présente', () => {
    expect(designRoute({ ANTHROPIC_API_KEY: 'k', GROQ_API_KEY: 'g' })).toEqual({ provider: 'anthropic', model: 'claude-sonnet-5-5' });
    expect(designRoute({ ANTHROPIC_API_KEY: 'k', AI_MODEL_DESIGN: 'claude-opus-5-5' })).toEqual({ provider: 'anthropic', model: 'claude-opus-5-5' });
  });

  it('se replie sur le modèle fort de Groq sans clé Anthropic', () => {
    expect(designRoute({ GROQ_API_KEY: 'g' })).toEqual({ provider: 'groq', model: 'openai/gpt-oss-120b' });
    expect(selectModel('create', modelConfig({}))).toBe('openai/gpt-oss-120b');
    expect(selectModel('restyle', modelConfig({}))).toBe('openai/gpt-oss-120b');
  });

  it('garde le modèle rapide pour les petites retouches de texte', () => {
    expect(selectModel('edit', modelConfig({}))).toBe('openai/gpt-oss-20b');
  });

  it('simule en développement sans clé, mais renvoie une erreur explicite en production', () => {
    expect(designRoute({ NODE_ENV: 'development' })).toEqual({ provider: 'mock', model: 'simulation' });
    expect(designRoute({ NODE_ENV: 'development', ANTHROPIC_API_KEY: 'k', AI_MOCK: '1' }).provider).toBe('mock');
    expect(designRoute({ NODE_ENV: 'production' })).toEqual({ provider: 'none', error: 'ai_not_configured' });
    expect(designRoute({ NODE_ENV: 'production', AI_MOCK: '1' })).toEqual({ provider: 'none', error: 'ai_not_configured' });
    expect(designRoute({ APP_ENV: 'production' }).provider).toBe('none');
  });
});
