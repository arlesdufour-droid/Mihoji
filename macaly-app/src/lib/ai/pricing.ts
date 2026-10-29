export const CREDITS_PER_TOKEN = 1;

export function tokensToCredits(tokens: number): number {
  return Math.ceil(tokens * CREDITS_PER_TOKEN);
}
