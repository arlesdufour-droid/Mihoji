import { describe, expect, it } from 'vitest';
import { estimateCredits } from './estimate';

describe('credit estimates', () => {
  it('scales with context and task type', () => {
    const chat = estimateCredits('a'.repeat(400), 'chat');
    const plan = estimateCredits('a'.repeat(400), 'plan');
    const longer = estimateCredits('a'.repeat(4_000), 'chat');
    expect(chat.low).toBeGreaterThan(0);
    expect(plan.high).toBeLessThan(chat.high);
    expect(longer.high).toBeGreaterThan(chat.high);
  });
});
