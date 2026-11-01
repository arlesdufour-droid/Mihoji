import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Génère src/lib/site/icons.ts : icônes SVG statiques (lucide, licence ISC) utilisées par les sections.
// Usage : npx tsx scripts/gen-site-icons.ts

const icons: Record<string, string> = {
  wrench: 'wrench', hammer: 'hammer', brush: 'paintbrush', flame: 'flame', droplets: 'droplets', zap: 'zap', home: 'house', key: 'key',
  shield: 'shield-check', truck: 'truck', clock: 'clock', phone: 'phone', mail: 'mail', pin: 'map-pin', star: 'star', heart: 'heart',
  leaf: 'leaf', flower: 'flower-2', scissors: 'scissors', camera: 'camera', dumbbell: 'dumbbell', utensils: 'utensils', wheat: 'wheat',
  croissant: 'croissant', car: 'car', stethoscope: 'stethoscope', scale: 'scale', briefcase: 'briefcase', graduation: 'graduation-cap',
  smile: 'face-slightly-smiling', sparkles: 'sparkles', thermometer: 'thermometer', ruler: 'ruler', helmet: 'hard-hat', check: 'check', award: 'award',
  users: 'users', calendar: 'calendar-days', sun: 'sun', snowflake: 'snowflake', cake: 'cake', bike: 'bike', plug: 'plug', sprout: 'sprout', chevron: 'chevron-down', bag: 'shopping-bag', card: 'credit-card',
};

type Node = [string, Record<string, string>];

function markup(nodes: Node[]) {
  return nodes.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([name]) => name !== 'key').map(([name, value]) => `${name}="${value}"`).join(' ')}/>`).join('');
}

async function main() {
  const entries: string[] = [];
  for (const [name, file] of Object.entries(icons)) {
    const loaded = await import(pathToFileURL(resolve(`node_modules/lucide-react/dist/esm/icons/${file}.mjs`)).href) as { __iconData: { node: Node[] } };
    if (!loaded.__iconData) throw new Error(`Icône illisible : ${file}`);
    entries.push(`  ${name}: '${markup(loaded.__iconData.node)}',`);
  }
  writeFileSync('src/lib/site/icons.ts', `// Fichier généré par scripts/gen-site-icons.ts (icônes lucide, licence ISC) — ne pas modifier à la main.
export const iconPaths = {
${entries.join('\n')}
} as const;

export type IconName = keyof typeof iconPaths;
export const iconNames = Object.keys(iconPaths) as [IconName, ...IconName[]];
`);
  console.log(`${entries.length} icônes écrites.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
