import { iconPaths, type IconName } from './icons';
import type { Cta, SiteImage } from './schema';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Tout texte venant d'un modèle est échappé ; les jetons {{company.*}} traversent tels quels et sont remplacés ensuite.
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ESCAPES[character]);
}

export function icon(name: IconName, extraClass = ''): string {
  return `<svg class="ic${extraClass ? ` ${extraClass}` : ''}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${iconPaths[name]}</svg>`;
}

export function menuIcon(): string {
  return '<svg class="ic" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export function button(cta: Cta, kind: 'primary' | 'ghost' | 'accent' = 'primary', extra = ''): string {
  return `<a class="btn btn-${kind}${extra ? ` ${extra}` : ''}" href="${esc(cta.href)}">${esc(cta.label)}</a>`;
}

function unsplashSrcset(src: string): { src: string; srcset: string } | null {
  try {
    const url = new URL(src);
    if (url.hostname !== 'images.unsplash.com') return null;
    const variant = (width: number) => {
      const copy = new URL(url.href);
      copy.searchParams.set('w', String(width));
      copy.searchParams.set('q', '75');
      copy.searchParams.set('fm', 'webp');
      copy.searchParams.set('fit', 'crop');
      copy.searchParams.set('auto', 'format');
      return copy.href;
    };
    return { src: variant(1200), srcset: [480, 800, 1200, 1600].map((width) => `${variant(width)} ${width}w`).join(', ') };
  } catch {
    return null;
  }
}

export type MediaOptions = { cls?: string; eager?: boolean; sizes?: string; placeholderIcon?: IconName; placeholderText?: string };

// Image d'un emplacement : vraie photo (tailles adaptées, texte alternatif, crédit) ou, à défaut, un visuel de remplacement aux couleurs du thème.
export function media(image: SiteImage | undefined, options: MediaOptions = {}): string {
  const cls = `media-box${options.cls ? ` ${options.cls}` : ''}`;
  if (!image?.src) {
    const label = image?.alt ?? '';
    const inner = options.placeholderText ? `<span class="ph-text" aria-hidden="true">${esc(options.placeholderText)}</span>` : icon(options.placeholderIcon ?? 'camera', 'ph-ic');
    return `<div class="${cls} media--placeholder"${label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"'}>${inner}</div>`;
  }
  const responsive = unsplashSrcset(image.src);
  const loading = options.eager ? 'eager" fetchpriority="high' : 'lazy';
  const sizes = options.sizes ?? '(min-width: 900px) 50vw, 100vw';
  const img = responsive
    ? `<img class="media" src="${esc(responsive.src)}" srcset="${esc(responsive.srcset)}" sizes="${esc(sizes)}" alt="${esc(image.alt)}" loading="${loading}" decoding="async">`
    : `<img class="media" src="${esc(image.src)}" alt="${esc(image.alt)}" loading="${loading}" decoding="async">`;
  const credit = image.credit
    ? `<small class="credit">Photo : <a href="${esc(image.credit.url)}" rel="noopener" target="_blank">${esc(image.credit.name)}</a> · <a href="https://unsplash.com/?utm_source=mihoji&amp;utm_medium=referral" rel="noopener" target="_blank">Unsplash</a></small>`
    : '';
  return `<div class="${cls}">${img}${credit}</div>`;
}

export function head(eyebrow: string | undefined, title: string | undefined, intro: string | undefined, options: { center?: boolean; level?: 'h1' | 'h2' } = {}): string {
  if (!title && !eyebrow && !intro) return '';
  const level = options.level ?? 'h2';
  return `<header class="s-head${options.center ? ' center' : ''}">${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}${title ? `<${level}>${esc(title)}</${level}>` : ''}${intro ? `<p class="lead">${esc(intro)}</p>` : ''}</header>`;
}

export function stars(rating: number): string {
  return `<span class="stars" role="img" aria-label="Note : ${rating} sur 5">${'★'.repeat(rating)}<span class="off">${'★'.repeat(5 - rating)}</span></span>`;
}

export function ticks(items: string[] | undefined, cls = 'ticks'): string {
  if (!items?.length) return '';
  return `<ul class="${cls}">${items.map((item) => `<li>${icon('check')}<span>${esc(item)}</span></li>`).join('')}</ul>`;
}
