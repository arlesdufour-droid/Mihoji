import type { SecurityFiles, SecurityIssue } from '../types';

const secretPattern = /\b(?:sk-|pk_live|AKIA|eyJ[A-Za-z0-9_-]+)\b|NEXT_PUBLIC_[A-Z0-9_]*(?:KEY|SECRET|TOKEN)/;
export function findExposedSecrets(files: SecurityFiles): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  for (const [file, content] of files) {
    if (!/\.(tsx?|jsx?|html|css)$/.test(file)) continue;
    content.split('\n').forEach((line, index) => {
      if (secretPattern.test(line)) issues.push({ severity: 'critical', rule: 'secret-exposed-client', file, line: index + 1, message: 'Un secret semble exposé dans du code envoyé au navigateur.', fixHint: 'Déplacez cette valeur dans une variable serveur.' });
    });
  }
  return issues;
}
