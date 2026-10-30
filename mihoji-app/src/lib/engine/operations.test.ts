import { describe, expect, it } from 'vitest';
import { applyOperations } from './operations';

describe('project operations', () => {
  it('creates, edits, and deletes files', () => {
    const result = applyOperations(new Map([['page.tsx', 'hello']]), { summary: 'update', operations: [
      { op: 'edit', path: 'page.tsx', search: 'hello', replace: 'welcome' },
      { op: 'create', path: 'styles.css', content: 'body {}' },
      { op: 'delete', path: 'styles.css' },
    ] });
    expect(result.get('page.tsx')).toBe('welcome');
    expect(result.has('styles.css')).toBe(false);
  });

  it('replaces the first occurrence of ambiguous edits', () => {
    const result = applyOperations(new Map([['page.tsx', 'hello hello']]), { summary: '', operations: [
      { op: 'edit', path: 'page.tsx', search: 'hello', replace: 'welcome' },
    ] });
    expect(result.get('page.tsx')).toBe('welcome hello');
  });

  it('rejects edits whose search text is absent', () => {
    expect(() => applyOperations(new Map([['page.tsx', 'hello']]), { summary: '', operations: [
      { op: 'edit', path: 'page.tsx', search: 'missing', replace: 'welcome' },
    ] })).toThrow('edit_missing');
  });
});
