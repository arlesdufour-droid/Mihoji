import { describe, expect, it } from 'vitest';
import { estimateCredits } from './estimate';

describe('credit estimates', () => {
  it('scales with context and task type', () => {
    const chat = estimateCredits('a'.repeat(400), 'chat');
    const generation = estimateCredits('a'.repeat(400), 'generate');
    expect(chat.low).toBeGreaterThan(0);
    expect(generation.high).toBeGreaterThan(chat.high);
  });
});
