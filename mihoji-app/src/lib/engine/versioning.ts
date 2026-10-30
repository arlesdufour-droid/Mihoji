import { randomUUID } from 'node:crypto';
import type { ProjectFiles } from './operations';

export type ProjectVersion = {
  id: string;
  projectId: string;
  parentVersionId?: string;
  createdBy: 'user' | 'agent';
  summary: string;
  files: ProjectFiles;
  status: 'draft' | 'built' | 'failed' | 'published';
};

export function restoreVersion(version: ProjectVersion, restoredBy: 'user' | 'agent' = 'user'): ProjectVersion {
  return {
    ...version,
    id: randomUUID(),
    parentVersionId: version.id,
    createdBy: restoredBy,
    summary: `Restored from ${version.id}`,
    files: new Map(version.files),
    status: 'draft',
  };
}

export function assertSafeProductionSql(sql: string) {
  const normalized = sql.replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim().toUpperCase();
  if (/\bDROP\b|\bTRUNCATE\b/.test(normalized)) throw new Error('destructive_production_operation');
  if (/\bDELETE\b/.test(normalized) && !/\bWHERE\b/.test(normalized)) throw new Error('unfiltered_production_delete');
  if (/\bALTER\s+TABLE\b.*\bDROP\s+COLUMN\b/.test(normalized)) throw new Error('destructive_production_migration');
}
