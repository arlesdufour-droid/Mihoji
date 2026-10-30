import { describe, expect, it } from 'vitest';
import { getExportFilename, getExportHeaders } from './export';

describe('settings export', () => {
  it('creates a dated attachment filename and download headers', () => {
    const date = new Date('2026-10-30T12:44:45.544Z');
    expect(getExportFilename(date)).toBe('mihoji-export-2026-10-30.json');
    expect(getExportHeaders(date)).toMatchObject({
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="mihoji-export-2026-10-30.json"',
      'Cache-Control': 'no-store',
    });
  });
});
