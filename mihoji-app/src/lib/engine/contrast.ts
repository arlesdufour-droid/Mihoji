import { directText, parseHtml, type El } from './html-analysis';
import { tailwindPalette } from './tailwind-palette';

export type Rgb = [number, number, number];

const NAMED: Record<string, Rgb> = { white: [255, 255, 255], black: [0, 0, 0] };
const LIGHT_TEXT = 'text-white';
const DARK_TEXT = 'text-slate-900';
const LIGHT_RGB: Rgb = [255, 255, 255];
const DARK_RGB: Rgb = hexToRgb(tailwindPalette['slate-900']) ?? [15, 23, 42];

function hexToRgb(hex: string): Rgb | null {
  let value = hex.replace('#', '');
  if (value.length === 3 || value.length === 4) value = value.split('').map((character) => character + character).join('');
  if (value.length !== 6 && value.length !== 8) return null;
  const numbers = [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
  return numbers.some(Number.isNaN) ? null : [numbers[0], numbers[1], numbers[2]];
}

export function parseColor(value: string): Rgb | null {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.startsWith('#')) return hexToRgb(trimmed);
  const functional = trimmed.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (functional) return [Number(functional[1]), Number(functional[2]), Number(functional[3])];
  return NAMED[trimmed] ?? null;
}

function channel(value: number) {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

export function luminance([red, green, blue]: Rgb): number {
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

export function contrastRatio(first: Rgb, second: Rgb): number {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

type ClassColor = { rgb: Rgb; alpha: number };

// Couleur désignée par un nom Tailwind (« blue-900 », « white », « [#1e3a8a] »), avec une éventuelle opacité (« /90 »).
function tailwindColor(name: string): ClassColor | null {
  const match = name.match(/^(.+?)(?:\/(\d{1,3}))?$/);
  if (!match) return null;
  const base = match[1];
  const alpha = match[2] ? Math.min(100, Number(match[2])) / 100 : 1;
  const arbitrary = base.match(/^\[(#[0-9a-fA-F]{3,8})\]$/);
  const hex = arbitrary ? arbitrary[1] : tailwindPalette[base];
  const rgb = hex ? hexToRgb(hex) : null;
  return rgb ? { rgb, alpha } : null;
}

function classTokens(element: El): string[] {
  return (element.attrs.class ?? '').split(/\s+/).filter(Boolean);
}

function isPlainToken(token: string) {
  return !token.includes(':');
}

function textColorToken(token: string): ClassColor | null {
  return isPlainToken(token) && token.startsWith('text-') ? tailwindColor(token.slice(5)) : null;
}

function inlineStyle(element: El): Record<string, string> {
  const style: Record<string, string> = {};
  for (const declaration of (element.attrs.style ?? '').split(';')) {
    const separator = declaration.indexOf(':');
    if (separator > 0) style[declaration.slice(0, separator).trim().toLowerCase()] = declaration.slice(separator + 1).trim();
  }
  return style;
}

function blend(top: ClassColor, below: Rgb): Rgb {
  return [0, 1, 2].map((index) => Math.round(top.rgb[index] * top.alpha + below[index] * (1 - top.alpha))) as Rgb;
}

function ownTextColor(element: El): Rgb | null {
  const styleColor = inlineStyle(element).color;
  if (styleColor) return parseColor(styleColor);
  let color: Rgb | null = null;
  for (const token of classTokens(element)) {
    const parsed = textColorToken(token);
    if (parsed) color = parsed.rgb;
  }
  return color;
}

function ownBackgrounds(element: El, below: Rgb[]): Rgb[] | null {
  const style = inlineStyle(element);
  const inline = style['background-color'] ?? style.background;
  if (inline) {
    const found = inline.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|\b(?:white|black)\b/i);
    const parsed = found ? parseColor(found[0]) : null;
    if (parsed) return [parsed];
  }
  const tokens = classTokens(element).filter(isPlainToken);
  const gradient = tokens.some((token) => token.startsWith('bg-gradient-') || token.startsWith('bg-linear-'));
  if (gradient) {
    const stops = tokens.filter((token) => /^(from|via|to)-/.test(token)).map((token) => tailwindColor(token.replace(/^(from|via|to)-/, ''))).filter((color): color is ClassColor => color !== null);
    if (stops.length) return stops.flatMap((stop) => below.map((underlying) => blend(stop, underlying)));
  }
  let solid: ClassColor | null = null;
  for (const token of tokens) {
    if (!token.startsWith('bg-')) continue;
    const parsed = tailwindColor(token.slice(3));
    if (parsed) solid = parsed;
  }
  return solid ? below.map((underlying) => blend(solid, underlying)) : null;
}

const LARGE_SIZES = new Set(['2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl']);

// Texte « large » au sens WCAG : au moins 24 px, ou 18,66 px en gras.
function isLargeText(element: El): boolean {
  const tokens = classTokens(element).filter(isPlainToken);
  const size = tokens.filter((token) => token.startsWith('text-')).map((token) => token.slice(5)).filter((value) => LARGE_SIZES.has(value) || value === 'xl').pop();
  if (!size) return false;
  if (LARGE_SIZES.has(size)) return true;
  return tokens.some((token) => ['font-bold', 'font-extrabold', 'font-black'].includes(token));
}

export type ContrastIssue = {
  key: string;
  text: string;
  ratio: number;
  required: number;
  background: Rgb;
  element: El;
};

export function contrastIssues(html: string): ContrastIssue[] {
  const { root } = parseHtml(html);
  const issues: ContrastIssue[] = [];
  const visit = (element: El, foreground: Rgb, backgrounds: Rgb[]) => {
    const tokens = classTokens(element);
    if (['script', 'style', 'svg'].includes(element.tag) || tokens.includes('hidden') || tokens.includes('sr-only')) return;
    const ownBackground = ownBackgrounds(element, backgrounds);
    const effectiveBackgrounds = ownBackground ?? backgrounds;
    const effectiveForeground = ownTextColor(element) ?? foreground;
    const text = directText(element);
    if (text && element.tag !== '#root') {
      const required = isLargeText(element) ? 3 : 4.5;
      let worst: { ratio: number; background: Rgb } | null = null;
      for (const background of effectiveBackgrounds) {
        const ratio = contrastRatio(effectiveForeground, background);
        if (!worst || ratio < worst.ratio) worst = { ratio, background };
      }
      if (worst && worst.ratio < required) issues.push({ key: `${element.tag}|${text}`, text, ratio: worst.ratio, required, background: worst.background, element });
    }
    for (const child of element.children) {
      if (typeof child !== 'string') visit(child, effectiveForeground, effectiveBackgrounds);
    }
  };
  visit(root, [0, 0, 0], [[255, 255, 255]]);
  return issues;
}

// Problèmes de lisibilité apparus avec la modification : ceux qui n'existaient pas déjà avant.
export function introducedContrastIssues(beforeHtml: string, afterHtml: string): ContrastIssue[] {
  const known = new Map<string, number>();
  for (const issue of contrastIssues(beforeHtml)) known.set(issue.key, (known.get(issue.key) ?? 0) + 1);
  return contrastIssues(afterHtml).filter((issue) => {
    const remaining = known.get(issue.key) ?? 0;
    if (remaining > 0) {
      known.set(issue.key, remaining - 1);
      return false;
    }
    return true;
  });
}

export type ContrastFix = { text: string; tone: 'clair' | 'foncé' };

function replaceTextColorInTag(tagSource: string, element: El, className: string, hex: string): string {
  const style = inlineStyle(element);
  if (style.color) {
    return tagSource.replace(/(style\s*=\s*["'][^"']*?)(?<![\w-])color\s*:\s*[^;"']+/i, `$1color:${hex}`);
  }
  const classAttribute = tagSource.match(/class\s*=\s*(["'])([^"']*)\1/i);
  if (classAttribute) {
    const kept = classAttribute[2].split(/\s+/).filter((token) => token && !textColorToken(token));
    return tagSource.replace(classAttribute[0], `class=${classAttribute[1]}${[...kept, className].join(' ')}${classAttribute[1]}`);
  }
  const nameEnd = tagSource.search(/[\s/>]/);
  return `${tagSource.slice(0, nameEnd)} class="${className}"${tagSource.slice(nameEnd)}`;
}

// Remplace la couleur du texte des éléments illisibles par du blanc ou un gris très foncé, selon leur fond.
export function fixContrast(html: string, issues: ContrastIssue[]): { html: string; fixes: ContrastFix[] } {
  const fixes: ContrastFix[] = [];
  const edits: { start: number; end: number; replacement: string }[] = [];
  const seen = new Set<El>();
  for (const issue of issues) {
    if (seen.has(issue.element)) continue;
    seen.add(issue.element);
    const light = contrastRatio(LIGHT_RGB, issue.background);
    const dark = contrastRatio(DARK_RGB, issue.background);
    const useLight = light >= dark;
    const element = issue.element;
    const source = html.slice(element.openStart, element.openEnd);
    edits.push({ start: element.openStart, end: element.openEnd, replacement: replaceTextColorInTag(source, element, useLight ? LIGHT_TEXT : DARK_TEXT, useLight ? '#ffffff' : '#0f172b') });
    fixes.push({ text: issue.text, tone: useLight ? 'clair' : 'foncé' });
  }
  let output = html;
  for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.replacement + output.slice(edit.end);
  return { html: output, fixes };
}
