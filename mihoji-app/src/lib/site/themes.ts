import type { StyleId } from './schema';

export type Palette = {
  id: string;
  label: string;
  bg: string;
  surface: string;
  alt: string;
  text: string;
  muted: string;
  primary: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  inverse: string;
  onInverse: string;
  onInverseMuted: string;
};

export type FontDef = { family: string; file: string; fallback: string };

export type StyleDef = {
  id: StyleId;
  label: string;
  tagline: string;
  fonts: { heading: FontDef; body: FontDef };
  palettes: Palette[];
  // Variables CSS propres au style : rayons, ombres, espacements, titres, boutons.
  tokens: Record<string, string>;
};

const inter: FontDef = { family: 'Inter', file: 'inter-latin-wght-normal.woff2', fallback: 'system-ui, -apple-system, "Segoe UI", sans-serif' };

export const styles: StyleDef[] = [
  {
    id: 'artisan',
    label: 'Artisan chaleureux',
    tagline: 'Tons chauds, formes douces, une touche de caractère : l’esprit de l’atelier et du commerce de proximité.',
    fonts: {
      heading: { family: 'Fraunces', file: 'fraunces-latin-wght-normal.woff2', fallback: 'Georgia, "Times New Roman", serif' },
      body: { family: 'Nunito', file: 'nunito-latin-wght-normal.woff2', fallback: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
    },
    palettes: [
      { id: 'terracotta', label: 'Terracotta', bg: '#FBF6EF', surface: '#FFFFFF', alt: '#F3E8D8', text: '#2B2118', muted: '#5F5042', primary: '#A8431F', onPrimary: '#FFFFFF', accent: '#E3A33B', onAccent: '#2B2118', inverse: '#3A2A1E', onInverse: '#FBF6EF', onInverseMuted: '#E6D8C6' },
      { id: 'foret', label: 'Forêt', bg: '#F8F6EF', surface: '#FFFFFF', alt: '#E9EDDF', text: '#1F2A22', muted: '#4D5B50', primary: '#2F5D46', onPrimary: '#FFFFFF', accent: '#D9A441', onAccent: '#1F2A22', inverse: '#22372B', onInverse: '#F8F6EF', onInverseMuted: '#D5DDCF' },
      { id: 'ardoise', label: 'Ardoise', bg: '#F7F5F2', surface: '#FFFFFF', alt: '#E8ECF1', text: '#1E2530', muted: '#4B5563', primary: '#2F4A6D', onPrimary: '#FFFFFF', accent: '#E0A458', onAccent: '#1E2530', inverse: '#243245', onInverse: '#F7F5F2', onInverseMuted: '#D3DAE4' },
    ],
    tokens: {
      '--r-sm': '10px', '--r-md': '18px', '--r-lg': '30px',
      '--shadow': '0 1px 2px rgba(60,40,20,.06), 0 10px 28px rgba(60,40,20,.09)',
      '--shadow-lg': '0 2px 4px rgba(60,40,20,.06), 0 24px 56px rgba(60,40,20,.16)',
      '--sy': 'clamp(4rem, 9vw, 7.5rem)',
      '--hw': '600', '--hls': '-0.015em', '--h1': 'clamp(2.5rem, 6vw, 4.25rem)', '--h2': 'clamp(1.9rem, 4vw, 2.85rem)', '--h3': 'clamp(1.2rem, 2vw, 1.4rem)',
      '--btn-r': '999px', '--btn-w': '700', '--btn-pad': '1rem 1.75rem', '--btn-tt': 'none', '--btn-ls': '0', '--btn-shadow': '0 6px 16px rgba(60,40,20,.18)',
      '--eyebrow-tt': 'none', '--eyebrow-ls': '0.02em', '--eyebrow-size': '1rem',
    },
  },
  {
    id: 'moderne',
    label: 'Moderne épuré',
    tagline: 'Beaucoup de blanc, une typographie nette, des lignes sobres : clair, rapide, professionnel.',
    fonts: {
      heading: { family: 'Plus Jakarta Sans', file: 'plus-jakarta-sans-latin-wght-normal.woff2', fallback: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
      body: inter,
    },
    palettes: [
      { id: 'bleu', label: 'Bleu', bg: '#FFFFFF', surface: '#FFFFFF', alt: '#F4F6FA', text: '#0F172A', muted: '#475569', primary: '#1D4ED8', onPrimary: '#FFFFFF', accent: '#0EA5E9', onAccent: '#04263A', inverse: '#0F172A', onInverse: '#FFFFFF', onInverseMuted: '#CBD5E1' },
      { id: 'emeraude', label: 'Émeraude', bg: '#FFFFFF', surface: '#FFFFFF', alt: '#F1F7F4', text: '#10231C', muted: '#46594F', primary: '#047857', onPrimary: '#FFFFFF', accent: '#34D399', onAccent: '#062B20', inverse: '#10231C', onInverse: '#FFFFFF', onInverseMuted: '#C7D9D0' },
      { id: 'graphite', label: 'Graphite', bg: '#FFFFFF', surface: '#FFFFFF', alt: '#F5F5F4', text: '#171717', muted: '#525252', primary: '#262626', onPrimary: '#FFFFFF', accent: '#F97316', onAccent: '#1C0A00', inverse: '#171717', onInverse: '#FFFFFF', onInverseMuted: '#D4D4D4' },
    ],
    tokens: {
      '--r-sm': '8px', '--r-md': '12px', '--r-lg': '20px',
      '--shadow': '0 1px 2px rgba(15,23,42,.05), 0 4px 14px rgba(15,23,42,.06)',
      '--shadow-lg': '0 2px 6px rgba(15,23,42,.06), 0 18px 44px rgba(15,23,42,.12)',
      '--sy': 'clamp(4.5rem, 10vw, 8.5rem)',
      '--hw': '700', '--hls': '-0.03em', '--h1': 'clamp(2.4rem, 5.6vw, 4rem)', '--h2': 'clamp(1.75rem, 3.6vw, 2.6rem)', '--h3': 'clamp(1.1rem, 1.8vw, 1.3rem)',
      '--btn-r': '12px', '--btn-w': '600', '--btn-pad': '0.95rem 1.5rem', '--btn-tt': 'none', '--btn-ls': '-0.005em', '--btn-shadow': '0 1px 2px rgba(15,23,42,.12)',
      '--eyebrow-tt': 'uppercase', '--eyebrow-ls': '0.12em', '--eyebrow-size': '0.78rem',
    },
  },
  {
    id: 'premium',
    label: 'Élégant premium',
    tagline: 'Sobriété, élégance, grandes respirations : pour un positionnement haut de gamme.',
    fonts: {
      heading: { family: 'Cormorant', file: 'cormorant-latin-wght-normal.woff2', fallback: 'Georgia, "Times New Roman", serif' },
      body: inter,
    },
    palettes: [
      { id: 'marine', label: 'Marine et or', bg: '#FAF8F4', surface: '#FFFFFF', alt: '#F0ECE4', text: '#1A1D26', muted: '#555B6B', primary: '#1F2A44', onPrimary: '#FFFFFF', accent: '#B08D57', onAccent: '#1A1D26', inverse: '#171C2B', onInverse: '#FAF8F4', onInverseMuted: '#CFC9BB' },
      { id: 'noir-or', label: 'Noir et or', bg: '#111214', surface: '#1A1B1E', alt: '#1F2024', text: '#F4F0E8', muted: '#B9B3A6', primary: '#C9A25F', onPrimary: '#14120E', accent: '#C9A25F', onAccent: '#14120E', inverse: '#0A0A0B', onInverse: '#F4F0E8', onInverseMuted: '#BDB7AA' },
    ],
    tokens: {
      '--r-sm': '2px', '--r-md': '4px', '--r-lg': '6px',
      '--shadow': '0 1px 0 rgba(0,0,0,.04), 0 10px 30px rgba(0,0,0,.07)',
      '--shadow-lg': '0 30px 70px rgba(0,0,0,.2)',
      '--sy': 'clamp(5rem, 11vw, 9.5rem)',
      '--hw': '500', '--hls': '0', '--h1': 'clamp(2.9rem, 7vw, 5.2rem)', '--h2': 'clamp(2.2rem, 4.6vw, 3.4rem)', '--h3': 'clamp(1.5rem, 2.4vw, 1.85rem)',
      '--btn-r': '2px', '--btn-w': '600', '--btn-pad': '1.05rem 2rem', '--btn-tt': 'uppercase', '--btn-ls': '0.14em', '--btn-shadow': 'none',
      '--eyebrow-tt': 'uppercase', '--eyebrow-ls': '0.28em', '--eyebrow-size': '0.74rem',
    },
  },
  {
    id: 'dynamique',
    label: 'Dynamique coloré',
    tagline: 'Couleurs franches, formes arrondies, énergie : pour marquer les esprits.',
    fonts: {
      heading: { family: 'Outfit', file: 'outfit-latin-wght-normal.woff2', fallback: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
      body: inter,
    },
    palettes: [
      { id: 'violet', label: 'Violet soleil', bg: '#FFFFFF', surface: '#FFFFFF', alt: '#F3EEFF', text: '#1B1033', muted: '#4F4668', primary: '#6D28D9', onPrimary: '#FFFFFF', accent: '#FBBF24', onAccent: '#1B1033', inverse: '#2A0F5C', onInverse: '#FFFFFF', onInverseMuted: '#DDD0F5' },
      { id: 'corail', label: 'Corail', bg: '#FFFFFF', surface: '#FFFFFF', alt: '#FFF1EC', text: '#2A1215', muted: '#6B4448', primary: '#C8102E', onPrimary: '#FFFFFF', accent: '#FFB703', onAccent: '#2A1215', inverse: '#4A0E1B', onInverse: '#FFFFFF', onInverseMuted: '#F6D5DA' },
      { id: 'turquoise', label: 'Turquoise', bg: '#FFFFFF', surface: '#FFFFFF', alt: '#E8F7F5', text: '#0B2723', muted: '#3F5F5A', primary: '#0F766E', onPrimary: '#FFFFFF', accent: '#FF8A3D', onAccent: '#2A1204', inverse: '#0B3B36', onInverse: '#FFFFFF', onInverseMuted: '#CBEAE6' },
    ],
    tokens: {
      '--r-sm': '14px', '--r-md': '22px', '--r-lg': '36px',
      '--shadow': '0 3px 0 rgba(27,16,51,.12), 0 14px 30px rgba(27,16,51,.1)',
      '--shadow-lg': '0 6px 0 rgba(27,16,51,.14), 0 28px 56px rgba(27,16,51,.18)',
      '--sy': 'clamp(4rem, 8.5vw, 7rem)',
      '--hw': '800', '--hls': '-0.025em', '--h1': 'clamp(2.7rem, 6.6vw, 4.8rem)', '--h2': 'clamp(2rem, 4.4vw, 3.1rem)', '--h3': 'clamp(1.2rem, 2vw, 1.45rem)',
      '--btn-r': '999px', '--btn-w': '800', '--btn-pad': '1rem 1.9rem', '--btn-tt': 'none', '--btn-ls': '0', '--btn-shadow': '0 4px 0 rgba(27,16,51,.25)',
      '--eyebrow-tt': 'uppercase', '--eyebrow-ls': '0.1em', '--eyebrow-size': '0.8rem',
    },
  },
];

export function getStyle(id: StyleId): StyleDef {
  const found = styles.find((style) => style.id === id);
  if (!found) throw new Error(`Style inconnu : ${id}`);
  return found;
}

export function resolveTheme(theme: { style: StyleId; palette?: string }): { style: StyleDef; palette: Palette } {
  const style = getStyle(theme.style);
  return { style, palette: style.palettes.find((palette) => palette.id === theme.palette) ?? style.palettes[0] };
}

// Paires (texte, fond) dont le contraste WCAG AA (4,5:1) est garanti pour chaque palette — vérifié par les tests.
export const guaranteedPairs: [keyof Palette, keyof Palette][] = [
  ['text', 'bg'], ['text', 'surface'], ['text', 'alt'], ['muted', 'bg'], ['muted', 'surface'], ['muted', 'alt'],
  ['primary', 'bg'], ['primary', 'surface'], ['primary', 'alt'], ['onPrimary', 'primary'], ['onAccent', 'accent'],
  ['onInverse', 'inverse'], ['onInverseMuted', 'inverse'], ['accent', 'inverse'],
];
