export const CREDITS_PER_TOKEN = 1;

export function tokensToCredits(tokens: number): number {
  return Math.ceil(tokens * CREDITS_PER_TOKEN);
}

// Tarifs publics en dollars par million de jetons (Anthropic : tarifs officiels ; Groq : estimation des tarifs affichés).
type ModelPrice = { input: number; output: number; cacheRead?: number; cacheWrite?: number };
export const MODEL_PRICES_USD: Record<string, ModelPrice> = {
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  'openai/gpt-oss-120b': { input: 0.15, output: 0.6 },
  'openai/gpt-oss-20b': { input: 0.075, output: 0.3 },
  'qwen/qwen3.8-27b': { input: 0.29, output: 0.59 },
};
// Prix par défaut d'un modèle inconnu : le plus cher des modèles de design, pour ne jamais sous-estimer.
const UNKNOWN_PRICE: ModelPrice = { input: 4, output: 20, cacheRead: 0.4, cacheWrite: 5 };
export const USD_TO_EUR = 0.87;

export type TokenUsage = { promptTokens?: number; completionTokens?: number; cacheReadTokens?: number; cacheWriteTokens?: number };

// Coût réel estimé d'un appel, en euros (« shadow cost » : ce que l'appel coûte à Mihoji, indépendamment des crédits).
export function shadowCostEur(model: string, usage: TokenUsage): number {
  const price = MODEL_PRICES_USD[model] ?? UNKNOWN_PRICE;
  const usd = ((usage.promptTokens ?? 0) * price.input
    + (usage.completionTokens ?? 0) * price.output
    + (usage.cacheReadTokens ?? 0) * (price.cacheRead ?? price.input)
    + (usage.cacheWriteTokens ?? 0) * (price.cacheWrite ?? price.input)) / 1_000_000;
  return Math.round(usd * USD_TO_EUR * 1_000_000) / 1_000_000;
}

export function formatEur(value: number): string {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 3, maximumFractionDigits: 4 });
}
