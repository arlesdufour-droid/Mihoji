import { findUnprotectedApiRoutes } from './rules/auth';
import { findUnfilteredDataAccess } from './rules/data-access';
import { findHardcodedCredentials } from './rules/files';
import { findUnvalidatedForms } from './rules/forms';
import { findExposedSecrets } from './rules/secrets';
import type { SecurityFiles, SecurityIssue } from './types';

export function auditSecurity(files: SecurityFiles): SecurityIssue[] {
  return [
    ...findExposedSecrets(files),
    ...findUnprotectedApiRoutes(files),
    ...findUnfilteredDataAccess(files),
    ...findHardcodedCredentials(files),
    ...findUnvalidatedForms(files),
    { severity: 'info', rule: 'dependency-audit-skipped', file: 'package.json', line: 1, message: 'npm audit nécessite l’exécution dans un bac à sable réel.', fixHint: 'Activez le bac à sable E2B pour analyser les dépendances.' },
  ];
}

export function canPublish(issues: SecurityIssue[]) {
  return !issues.some((issue) => issue.severity === 'critical');
}
