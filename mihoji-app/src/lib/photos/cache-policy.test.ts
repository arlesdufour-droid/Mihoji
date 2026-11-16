import { describe, expect, it } from 'vitest';
import { effectiveCacheSource, isCacheFresh } from './cache-policy';

const now = new Date('2026-11-16T12:00:00Z');
const ago = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

describe('durée du cache des photos', () => {
  it('Pixabay : 24 heures au plus (ses adresses expirent)', () => {
    expect(isCacheFresh('pixabay', ago(1), now)).toBe(true);
    expect(isCacheFresh('pixabay', ago(24), now)).toBe(true);
    expect(isCacheFresh('pixabay', ago(25), now)).toBe(false);
    expect(isCacheFresh('pixabay', ago(8 * 24), now)).toBe(false); // le cas constaté : 8 jours, HTTP 400
  });
  it('Unsplash : un mois', () => {
    expect(isCacheFresh('unsplash', ago(8 * 24), now)).toBe(true);
    expect(isCacheFresh('unsplash', ago(29 * 24), now)).toBe(true);
    expect(isCacheFresh('unsplash', ago(31 * 24), now)).toBe(false);
  });
  it('une entrée « unsplash » qui contient une adresse Pixabay suit la règle de Pixabay (anciennes entrées mixtes)', () => {
    const mixed = ['https://images.unsplash.com/photo-1?w=800', 'https://pixabay.com/get/abc_1280.jpg'];
    expect(effectiveCacheSource('unsplash', mixed)).toBe('pixabay');
    expect(isCacheFresh(effectiveCacheSource('unsplash', mixed), ago(8 * 24), now)).toBe(false);
    expect(effectiveCacheSource('unsplash', ['https://images.unsplash.com/photo-1'])).toBe('unsplash');
    expect(isCacheFresh(effectiveCacheSource('unsplash', ['https://images.unsplash.com/photo-1']), ago(8 * 24), now)).toBe(true);
    expect(effectiveCacheSource('pixabay', [])).toBe('pixabay');
  });
  it('une date dans le futur (horloge décalée) est considérée comme fraîche', () => {
    expect(isCacheFresh('pixabay', new Date(now.getTime() + 60_000), now)).toBe(true);
  });
});
