import { describe, expect, it } from 'vitest';
import { scanPublishedSite } from './site-scan';

describe('scanPublishedSite', () => {
  it('detects credential and brand impersonation signals', () => {
    expect(scanPublishedSite({ 'index.html': '<form>Mot de passe Colissimo</form>' })).toHaveLength(2);
  });

  it('ignores normal business copy', () => {
    expect(scanPublishedSite({ 'index.html': '<h1>Atelier de menuiserie</h1>' })).toEqual([]);
  });
});
