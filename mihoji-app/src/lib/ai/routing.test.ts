import { describe, expect, it } from 'vitest';
import { modelConfig, selectModel } from './routing';

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
