import { describe, expect, it } from 'vitest';
import { auditSeo } from './audit';

describe('SEO audit', () => {
  it('accepts a complete page template', () => {
    const files = new Map([
      ['app/page.tsx', '<h1>Accueil</h1><img alt="Logo" /><a href="/about">About</a>'],
      ['app/about/page.tsx', '<h1>About</h1>'],
      ['app/layout.tsx', 'export const metadata = {}'],
      ['app/sitemap.ts', 'export default function sitemap() {}'],
      ['app/robots.ts', 'export default function robots() {}'],
    ]);
    expect(auditSeo(files)).toHaveLength(0);
  });

  it('reports missing H1 and metadata', () => {
    const issues = auditSeo(new Map([['app/page.tsx', '<p>Hello</p>']]));
    expect(issues.map((issue) => issue.rule)).toEqual(expect.arrayContaining(['h1-required', 'metadata', 'sitemap', 'robots']));
  });
});
