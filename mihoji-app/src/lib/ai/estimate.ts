import type { AiTask } from './routing';

export type CreditEstimate = { low: number; high: number };

export function estimateCredits(context: string, task: AiTask): CreditEstimate {
  const contextTokens = Math.max(1, Math.ceil(context.length / 4));
  const multiplier = task === 'generate' || task === 'fix' ? 2 : task === 'plan' ? 0.5 : 1;
  const low = Math.max(1, Math.ceil(contextTokens * multiplier));
  return { low, high: Math.ceil(low * 1.8) };
}
