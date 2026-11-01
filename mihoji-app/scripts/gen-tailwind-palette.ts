import { readFileSync, writeFileSync } from 'node:fs';

// Génère src/lib/engine/tailwind-palette.ts à partir du thème Tailwind installé (couleurs oklch → sRGB hexadécimal).
// Usage : npx tsx scripts/gen-tailwind-palette.ts

function oklchToHex(lightness: number, chroma: number, hue: number): string {
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${linear.map((value) => {
    const clamped = Math.min(1, Math.max(0, value));
    const gamma = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(gamma * 255).toString(16).padStart(2, '0');
  }).join('')}`;
}

function main() {
  const css = readFileSync('node_modules/tailwindcss/theme.css', 'utf8');
  const entries: string[] = [];
  for (const match of css.matchAll(/--color-([a-z]+-\d+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/g)) {
    entries.push(`  '${match[1]}': '${oklchToHex(Number(match[2]) / 100, Number(match[3]), Number(match[4]))}',`);
  }
  if (entries.length < 200) throw new Error(`Palette incomplète : ${entries.length} couleurs.`);
  const output = `// Fichier généré par scripts/gen-tailwind-palette.ts — ne pas modifier à la main.
export const tailwindPalette: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
${entries.join('\n')}
};
`;
  writeFileSync('src/lib/engine/tailwind-palette.ts', output);
  console.log(`${entries.length} couleurs écrites.`);
}

main();
