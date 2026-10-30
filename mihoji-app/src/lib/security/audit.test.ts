import { describe, expect, it } from 'vitest';
import { auditSecurity, canPublish } from './audit';

describe('security audit', () => {
  it('blocks a client-side secret', () => {
    const issues = auditSecurity(new Map([['app/page.tsx', 'const key = "sk-live-secret-value";']]));
    expect(issues.some((issue) => issue.rule === 'secret-exposed-client')).toBe(true);
    expect(canPublish(issues)).toBe(false);
  });

  it('keeps validated API routes publishable', () => {
    const issues = auditSecurity(new Map([['app/api/data/route.ts', 'export async function GET() { const session = await getSession(); }']]));
    expect(canPublish(issues)).toBe(true);
  });
});
