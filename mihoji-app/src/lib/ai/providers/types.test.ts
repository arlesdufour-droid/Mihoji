import { describe, expect, it } from 'vitest';
import { isRateLimitError, LlmProviderError } from './types';

describe('isRateLimitError', () => {
  it('détecte la limite de débit du fournisseur', () => {
    expect(isRateLimitError(new LlmProviderError('rate_limit_exceeded', 429))).toBe(true);
    expect(isRateLimitError(new LlmProviderError('ai_upstream_error', 429))).toBe(true);
  });

  it('ignore les autres erreurs', () => {
    expect(isRateLimitError(new LlmProviderError('model_not_found', 404))).toBe(false);
    expect(isRateLimitError(new LlmProviderError('ai_upstream_error', 500))).toBe(false);
    expect(isRateLimitError(new Error('rate_limit_exceeded'))).toBe(false);
    expect(isRateLimitError(null)).toBe(false);
  });
});
