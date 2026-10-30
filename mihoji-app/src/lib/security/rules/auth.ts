import type { SecurityFiles, SecurityIssue } from '../types';

export function findUnprotectedApiRoutes(files: SecurityFiles): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  for (const [file, content] of files) {
    if (!/app\/api\/.*route\.(ts|js)$/.test(file) || !/\b(?:GET|POST|PUT|PATCH|DELETE)\b/.test(content)) continue;
    if (!/(?:getSession|getUser|auth|authenticate|supabase)/i.test(content)) issues.push({ severity: 'warning', rule: 'api-authentication', file, line: 1, message: 'Cette route API ne montre pas de contrôle d’authentification.', fixHint: 'Vérifiez la session avant de lire ou modifier des données.' });
  }
  return issues;
}
