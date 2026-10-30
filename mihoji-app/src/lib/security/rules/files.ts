import type { SecurityFiles, SecurityIssue } from '../types';

export function findHardcodedCredentials(files: SecurityFiles): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  for (const [file, content] of files) {
    if (/(^|\/)\.env(?:\..*)?$/.test(file)) issues.push({ severity: 'critical', rule: 'env-file', file, line: 1, message: 'Un fichier .env est présent dans le projet publié.', fixHint: 'Retirez le fichier et configurez le secret côté hébergeur.' });
    content.split('\n').forEach((line, index) => {
      if (/(?:password|secret|api[_-]?key)\s*[:=]\s*['"][^'"]{8,}/i.test(line)) issues.push({ severity: 'critical', rule: 'hardcoded-credential', file, line: index + 1, message: 'Un identifiant semble codé en dur.', fixHint: 'Utilisez une variable d’environnement serveur.' });
    });
  }
  return issues;
}
