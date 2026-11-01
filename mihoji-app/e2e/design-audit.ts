import type { Page } from '@playwright/test';

export type AuditResult = {
  overflow: number;
  contrast: { text: string; ratio: number; required: number }[];
  imagesWithoutAlt: number;
  h1Count: number;
  fonts: string[];
};

// Audit d'une page de site généré, exécuté dans le navigateur : contrastes réellement calculés, débordements, images, polices.
export async function auditPage(page: Page): Promise<AuditResult> {
  await page.evaluate(async () => { await document.fonts.ready; });
  return page.evaluate(() => {
    // Menu mobile et questions de la FAQ ouverts : leur contenu est audité comme le reste.
    document.querySelectorAll('details').forEach((details) => { details.open = true; });
    type Rgba = [number, number, number, number];
    const parse = (value: string): Rgba | null => {
      const functional = value.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
      if (functional) return [Number(functional[1]), Number(functional[2]), Number(functional[3]), functional[4] ? (functional[4].endsWith('%') ? Number(functional[4].slice(0, -1)) / 100 : Number(functional[4])) : 1];
      const srgb = value.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\)$/);
      if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255, srgb[4] ? (srgb[4].endsWith('%') ? Number(srgb[4].slice(0, -1)) / 100 : Number(srgb[4])) : 1];
      return null;
    };
    const luminance = ([r, g, b]: Rgba) => {
      const channel = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const ratio = (a: Rgba, b: Rgba) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
    const over = (top: Rgba, below: Rgba): Rgba => [0, 1, 2].map((i) => top[i] * top[3] + below[i] * (1 - top[3])).concat([1]) as Rgba;

    // Fond réellement visible derrière un élément ; null si une image ou un dégradé s'y mêle (non vérifiable).
    const backgroundOf = (element: Element): Rgba | null => {
      const layers: Rgba[] = [];
      for (let node: Element | null = element; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.backgroundImage !== 'none') return null;
        const color = parse(style.backgroundColor);
        if (color && color[3] > 0) { layers.push(color); if (color[3] >= 1) break; }
      }
      return layers.reverse().reduce<Rgba>((acc, layer) => over(layer, acc), [255, 255, 255, 1]);
    };

    const failures: { text: string; ratio: number; required: number }[] = [];
    for (const element of document.body.querySelectorAll('*')) {
      if (element.closest('.sr-only, .skip, .credit, .stars .off, [aria-hidden="true"], .media--placeholder, .s-hero--photo')) continue;
      const own = [...element.childNodes].filter((node) => node.nodeType === 3 && node.textContent?.trim()).map((node) => node.textContent!.trim()).join(' ');
      if (!own) continue;
      const style = getComputedStyle(element);
      if (!element.checkVisibility({ visibilityProperty: true })) continue;
      const foreground = parse(style.color);
      const background = backgroundOf(element);
      if (!foreground || !background) continue;
      const size = Number.parseFloat(style.fontSize);
      const bold = Number(style.fontWeight) >= 700;
      const required = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
      const value = ratio(over(foreground, background), background);
      if (value < required) failures.push({ text: own.slice(0, 50), ratio: Math.round(value * 100) / 100, required });
    }

    const documentWidth = document.documentElement.clientWidth;
    const overflowing = [...document.querySelectorAll('body *')].filter((element) => {
      if (element.closest('.gallery-scroll, .sr-only, .skip')) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.right > documentWidth + 1;
    }).length;
    return {
      overflow: Math.max(overflowing, document.documentElement.scrollWidth > documentWidth + 1 ? 1 : 0),
      contrast: failures,
      imagesWithoutAlt: [...document.images].filter((image) => !image.hasAttribute('alt')).length,
      h1Count: document.querySelectorAll('h1').length,
      fonts: [...document.fonts].filter((font) => font.status === 'loaded').map((font) => font.family.replace(/"/g, '')),
    };
  });
}
