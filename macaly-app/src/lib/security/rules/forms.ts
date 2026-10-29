import type { SecurityFiles, SecurityIssue } from '../types';

export function findUnvalidatedForms(files: SecurityFiles): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  for (const [file, content] of files) {
    if (/<form\b/.test(content) && !/(?:zod|safeParse|parseBody|validate)/i.test(content)) issues.push({ severity: 'warning', rule: 'server-validation', file, line: 1, message: 'Ce formulaire ne montre pas de validation côté serveur.', fixHint: 'Validez les données reçues avec un schéma côté serveur.' });
  }
  return issues;
}
