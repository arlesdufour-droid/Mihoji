import { afterEach, describe, expect, it } from 'vitest';
import { getPublicOrigin } from './site-url';

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
});

describe('getPublicOrigin', () => {
  it('prefers the configured public site URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://mihoji.example';
    const request = new Request('http://0.0.0.0:3000/path', { headers: { host: 'internal:3000' } });
    expect(getPublicOrigin(request)).toBe('https://mihoji.example');
  });

  it('uses forwarded Codespace headers when no URL is configured', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const request = new Request('http://0.0.0.0:3000/path', { headers: { 'x-forwarded-host': 'public.example', 'x-forwarded-proto': 'https' } });
    expect(getPublicOrigin(request)).toBe('https://public.example');
  });

  it('does not fall back to localhost or the internal host', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const request = new Request('http://0.0.0.0:3000/path', { headers: { host: '0.0.0.0:3000' } });
    expect(getPublicOrigin(request)).toBeNull();
    const localhostRequest = new Request('http://localhost:3000/path', { headers: { host: 'localhost:3000' } });
    expect(getPublicOrigin(localhostRequest)).toBeNull();
  });
});
