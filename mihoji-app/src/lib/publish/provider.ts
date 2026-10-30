import { isDemoMode } from '@/lib/supabase/config';
import type { PublishProvider } from './types';

class MockPublishProvider implements PublishProvider {
  async publish({ siteName }: Parameters<PublishProvider['publish']>[0]) {
    const domain = process.env.PUBLISHED_SITES_DOMAIN ?? 'sites.mihoji.local';
    return { url: `https://${siteName}.${domain}` };
  }
}

class VercelPublishProvider implements PublishProvider {
  async publish({ siteName, files }: Parameters<PublishProvider['publish']>[0]) {
    const token = process.env.VERCEL_TOKEN;
    if (!token) throw new Error('VERCEL_TOKEN_missing');
    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: siteName, files: Object.entries(files).map(([file, data]) => ({ file, data })), target: 'production', routes: [{ src: '/(.*)', headers: { 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; script-src 'self'", 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains', 'X-Content-Type-Options': 'nosniff' } }] }),
    });
    if (!response.ok) throw new Error('publish_provider_failed');
    const result = await response.json() as { url?: string };
    if (!result.url) throw new Error('publish_url_missing');
    return { url: `https://${siteName}.${process.env.PUBLISHED_SITES_DOMAIN ?? result.url}` };
  }
}

export function getPublishProvider(): PublishProvider {
  return process.env.NODE_ENV !== 'production' || isDemoMode() ? new MockPublishProvider() : new VercelPublishProvider();
}
