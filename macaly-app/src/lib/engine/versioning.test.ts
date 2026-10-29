import { describe, expect, it } from 'vitest';
import { assertSafeProductionSql, restoreVersion } from './versioning';

describe('version restoration', () => {
  it('creates a new draft without changing the source', () => {
    const source = { id: 'old', projectId: 'project', createdBy: 'agent' as const, summary: 'Built', files: new Map([['page.tsx', 'old']]), status: 'built' as const };
    const restored = restoreVersion(source);
    expect(restored.id).not.toBe(source.id);
    expect(restored.parentVersionId).toBe(source.id);
    expect(restored.status).toBe('draft');
    expect(source.status).toBe('built');
  });

  it('rejects destructive production SQL', () => {
    expect(() => assertSafeProductionSql('DELETE FROM users')).toThrow('unfiltered_production_delete');
    expect(() => assertSafeProductionSql('DELETE FROM users WHERE id = $1')).not.toThrow();
  });
});
