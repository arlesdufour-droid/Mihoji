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

  it('rejects ambiguous edits', () => {
    expect(() => applyOperations(new Map([['page.tsx', 'hello hello']]), { summary: '', operations: [
      { op: 'edit', path: 'page.tsx', search: 'hello', replace: 'welcome' },
    ] })).toThrow('edit_ambiguous');
  });
});
