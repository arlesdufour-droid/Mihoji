import { buildCss } from './css';
import { esc, menuIcon } from './html';
import type { InviteKind, Section, SectionType, SiteDescription } from './schema';
import { moduleAnchors, type DisplayModule } from './modules';
import { renderSection, type SectionContext } from './sections';
import { resolveHeader, resolveTheme } from './themes';

export type RenderOptions = {
  // Dossier des polices auto-hébergées (par défaut /fonts, servi par l'application).
  fontBase?: string;
  // Insère le CSS dans la page (aperçu dans le Studio) au lieu d'un fichier styles.css.
  inlineCss?: boolean;
  // Aperçu du Studio : affiche aussi les emplacements « à compléter » (jamais dans le site publié).
  studio?: boolean;
};

export type RenderedSite = { files: Record<string, string>; sectionTypes: SectionType[] };

const NAV_LABELS: Partial<Record<SectionType, string>> = {
  about: 'À propos', services: 'Prestations', products: 'Nos produits', gallery: 'Réalisations', testimonials: 'Avis',
  hours: 'Horaires', area: 'Zone d’intervention', faq: 'Questions', team: 'Équipe', contact: 'Contact', map: 'Accès',
};

export function pageFile(slug: string): string {
  return `${slug}.html`;
}

const MODULE_NAV: Record<DisplayModule, string> = {
  quote: 'Devis', booking: 'Réserver', shop: 'Commander', payment: 'Tarifs', newsletter: 'Newsletter', clientArea: 'Espace client',
};

function navLabel(section: Section): string | undefined {
  if (section.nav === false) return undefined;
  if (typeof section.nav === 'string') return section.nav;
  return section.type === 'module' ? MODULE_NAV[section.module] : NAV_LABELS[section.type];
}

function sectionTone(section: Section, previous: 'default' | 'alt' | 'inverse'): 'default' | 'alt' | 'inverse' {
  // Les modules (formulaires, listes, boutons) restent sur fond clair.
  if (section.type === 'module') return section.tone && section.tone !== 'inverse' ? section.tone : previous === 'default' ? 'alt' : 'default';
  if (section.tone) return section.tone;
  if (section.type === 'stats') return section.variant === 'row' ? 'inverse' : previous === 'default' ? 'alt' : 'default';
  if (section.type === 'cta') return 'default';
  return previous === 'default' ? 'alt' : 'default';
}

function navFor(site: SiteDescription, contexts: { section: Section; id: string }[]): { label: string; href: string }[] {
  if (site.pages.length > 1) return site.pages.map((page) => ({ label: page.title, href: pageFile(page.slug) }));
  const links = contexts
    .filter(({ section }) => navLabel(section))
    .map(({ section, id }) => ({ label: navLabel(section)!, href: `#${id}`, type: section.type }))
    .filter((link, index, list) => list.findIndex((other) => other.label === link.label) === index);
  if (links.length <= 5) return links.map(({ label, href }) => ({ label, href }));
  const contact = links.find((link) => link.type === 'contact');
  const head = links.filter((link) => link !== contact).slice(0, contact ? 4 : 5);
  return [...head, ...(contact ? [contact] : [])].map(({ label, href }) => ({ label, href }));
}

const INVITES: Record<InviteKind, { title: string; text: string }> = {
  testimonials: { title: 'Avis de vos clients', text: 'Ajoutez de vrais avis pour rassurer vos futurs clients. Dites-le dans le chat : « Ajoute cet avis : … ». Cet encart n’apparaît pas sur le site publié.' },
  stats: { title: 'Chiffres clés', text: 'Ajoutez vos vrais chiffres (années d’existence, nombre de clients…). Dites-le dans le chat : « Ajoute le chiffre : … ». Cet encart n’apparaît pas sur le site publié.' },
  hours: { title: 'Vos horaires d’ouverture', text: 'Indiquez vos vrais horaires dans le chat : « Nos horaires : lundi au vendredi, 9 h à 18 h ». Cet encart n’apparaît pas sur le site publié.' },
};

function inviteBlock(kind: InviteKind): string {
  const invite = INVITES[kind];
  return `<section class="s s-invite tone-default" data-invite="${kind}" aria-label="${esc(invite.title)}"><div class="wrap"><div class="invite"><strong>${esc(invite.title)}</strong><p>${esc(invite.text)}</p></div></div></section>`;
}

function siteHeader(site: SiteDescription, nav: { label: string; href: string }[]): string {
  const logo = site.brand?.logo;
  const brand = logo ? `<span class="brand-wrap"><img src="${esc(logo.src)}" alt="${esc(logo.alt)}" height="40"></span>` : '{{company.name}}';
  const brandTag = (content: string) => `<a class="brand" href="${site.pages.length > 1 ? pageFile('index') : '#top'}">${content}</a>`;
  const links = nav.map((link) => `<a href="${esc(link.href)}">${esc(link.label)}</a>`).join('');
  const menu = nav.length ? `<details class="nav-mobile"><summary aria-label="Ouvrir le menu">${menuIcon()}</summary><nav aria-label="Menu mobile">${links}<a class="btn btn-primary btn-sm menu-cta" href="${esc(site.primaryCta.href)}">${esc(site.primaryCta.label)}</a></nav></details>` : '';
  return `<header class="site-header header--${resolveHeader(site.theme)}"><div class="wrap bar">${brandTag(brand)}${nav.length ? `<nav class="nav-desktop" aria-label="Navigation principale">${links}</nav>` : ''}<div class="bar-actions"><a class="btn btn-primary btn-sm" href="${esc(site.primaryCta.href)}">${esc(site.primaryCta.label)}</a>${menu}</div></div></header>`;
}

function uniqueIds(sections: Section[]): { section: Section; id: string }[] {
  const seen = new Map<string, number>();
  return sections.map((section) => {
    const base = section.id ?? (section.type === 'module' ? moduleAnchors[section.module] : section.type);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { section, id: count === 1 ? base : `${base}-${count}` };
  });
}

// Garantit un pied de page unique en dernière position (ajouté s'il manque).
export function withFooter(sections: Section[]): Section[] {
  return sections.some((section) => section.type === 'footer') ? sections : [...sections, { type: 'footer', variant: 'columns' }];
}

export function renderSite(site: SiteDescription, options: RenderOptions = {}): RenderedSite {
  const fontBase = options.fontBase ?? '/fonts';
  const { style, palette } = resolveTheme(site.theme);
  const used = new Set<SectionType>();
  const pages = site.pages.map((page) => ({ page, sections: withFooter(page.sections) }));
  for (const { sections } of pages) sections.forEach((section) => used.add(section.type));
  const css = buildCss(site.theme, used, fontBase);
  const files: Record<string, string> = {};
  if (!options.inlineCss) files['styles.css'] = css;

  pages.forEach(({ page, sections }) => {
    const identified = uniqueIds(sections);
    const nav = navFor(site, identified);
    // Le premier bloc après le bandeau reste au ton par défaut : on part donc de « alt » pour alterner.
    let tone: 'default' | 'alt' | 'inverse' = 'alt';
    const body = identified.map(({ section, id }) => {
      const resolved = section.type === 'hero' || section.type === 'footer' ? 'default' : sectionTone(section, tone);
      if (section.type !== 'hero' && section.type !== 'footer') tone = resolved;
      const context: SectionContext = { id, tone: resolved, primaryCta: site.primaryCta, modules: site.modules };
      return renderSection(section, context, site.pages.length > 1 ? [] : nav);
    });
    // Emplacements « à compléter » : seulement dans le Studio, juste avant la section indiquée (par défaut avant le contact, l'accès ou le pied de page).
    if (options.studio && page.invites?.length) {
      for (const invite of page.invites) {
        if (sections.some((section) => section.type === invite.kind)) continue;
        const wanted = invite.before ? identified.findIndex(({ section }) => section.type === invite.before) : -1;
        const fallback = identified.findIndex(({ section }) => section.type === 'contact' || section.type === 'map' || section.type === 'footer');
        const at = wanted >= 0 ? wanted : fallback >= 0 ? fallback : body.length;
        body.splice(at, 0, inviteBlock(invite.kind));
      }
    }
    const hero = body[0] && sections[0].type === 'hero' ? body.shift()! : '';
    const footer = body.pop() ?? '';
    const preload = [style.fonts.heading, style.fonts.body].filter((font, index, list) => list.findIndex((other) => other.file === font.file) === index).map((font) => `<link rel="preload" href="${esc(fontBase)}/${font.file}" as="font" type="font/woff2" crossorigin>`).join('');
    const title = page.slug === 'index' ? site.seo.title : `${page.title} — {{company.name}}`;
    const description = page.description ?? site.seo.description;
    const stylesheet = options.inlineCss ? `<style>${css}</style>` : `<link rel="stylesheet" href="styles.css">`;
    files[pageFile(page.slug)] = `<!doctype html><html lang="fr" data-style="${style.id}" data-palette="${palette.id}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="theme-color" content="${palette.bg}">${preload}${stylesheet}</head><body id="top"><a class="skip" href="#main">Aller au contenu</a>${siteHeader(site, nav)}<main id="main">${hero}${body.join('')}</main>${footer}</body></html>`;
  });
  return { files, sectionTypes: [...used] };
}
