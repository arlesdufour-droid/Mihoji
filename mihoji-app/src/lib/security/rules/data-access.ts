import type { SecurityFiles, SecurityIssue } from '../types';

export function findUnfilteredDataAccess(files: SecurityFiles): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  for (const [file, content] of files) {
    if (!/(?:userId|ownerId|workspaceId)/.test(content) || !/(?:select|from|query|findMany|findFirst)/i.test(content)) continue;
    const normalized = content.replace(/\s+/g, ' ');
    if (!/(?:userId|ownerId|workspaceId).*(?:where|eq|filter)|(?:where|eq|filter).*(?:userId|ownerId|workspaceId)/.test(normalized)) issues.push({ severity: 'critical', rule: 'unfiltered-data-access', file, line: 1, message: 'Un accès à des données utilisateur semble ne pas filtrer l’utilisateur courant.', fixHint: 'Ajoutez une condition sur userId, ownerId ou workspaceId.' });
  }
  return issues;
}
