import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'src');
const forbidden = [
  'Restore previous version',
  'Try a different approach',
  'This broke my app',
  'Free fixes',
  'Fix with AI',
  'Credits remaining',
  'Add credits',
  'Publish',
  'Share',
  'Open account menu',
  'Workspace settings',
];
const messages = readFileSync(join(root, 'messages/fr.ts'), 'utf8');
const english = readFileSync(join(root, 'messages/en.ts'), 'utf8');
const keys = [...english.matchAll(/^\s{2}([A-Za-z0-9_]+):/gm)].map((match) => match[1]);
const missing = keys.filter((key) => !new RegExp(`^\\s{2}${key}:`, 'm').test(messages));
const violations: string[] = [];

function visit(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== 'messages') visit(path);
    if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      const content = readFileSync(path, 'utf8');
      if (path.endsWith('.test.ts')) continue;
      for (const phrase of forbidden) {
        const visibleText = new RegExp(`(?:>|'|")${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:<|'|")`);
        if (visibleText.test(content)) violations.push(`${path}: ${phrase}`);
      }
    }
  }
}

visit(root);
for (const key of missing) violations.push(`messages/fr.ts: missing key ${key}`);
if (violations.length) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
}
