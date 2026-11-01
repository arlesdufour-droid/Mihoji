import { button, esc, head, icon, initials, media, stars, ticks } from './html';
import type { Cta, Section, SiteDescription } from './schema';

export type SectionContext = {
  id: string;
  tone: 'default' | 'alt' | 'inverse';
  primaryCta: SiteDescription['primaryCta'];
};

function open(section: Section, context: SectionContext, extra = ''): string {
  return `<section class="s s-${section.type} s-${section.type}--${section.variant} tone-${context.tone}${extra ? ` ${extra}` : ''}" id="${esc(context.id)}">`;
}

const wrap = (inner: string, cls = '') => `<div class="wrap${cls ? ` ${cls}` : ''}">${inner}</div>`;

function actions(primary: Cta | undefined, secondary: Cta | undefined, kinds: { primary: 'primary' | 'accent'; ghost?: boolean } = { primary: 'primary' }): string {
  if (!primary && !secondary) return '';
  return `<div class="actions">${primary ? button(primary, kinds.primary) : ''}${secondary ? button(secondary, 'ghost') : ''}</div>`;
}

function hero(section: Extract<Section, { type: 'hero' }>, context: SectionContext): string {
  const cta = section.cta ?? context.primaryCta;
  const copy = `<div class="hero-copy">${section.eyebrow ? `<p class="eyebrow">${esc(section.eyebrow)}</p>` : ''}<h1>${esc(section.title)}</h1>${section.subtitle ? `<p class="lead">${esc(section.subtitle)}</p>` : ''}${actions(cta, section.secondaryCta, { primary: section.variant === 'photo' ? 'accent' : 'primary' })}${ticks(section.highlights, 'ticks hero-ticks')}</div>`;
  if (section.variant === 'photo') {
    return `${open(section, context)}<div class="hero-bg">${media(section.image, { eager: true, cls: 'fill', sizes: '100vw', placeholderIcon: 'sparkles' })}</div>${wrap(copy, 'hero-inner')}</section>`;
  }
  if (section.variant === 'split') {
    return `${open(section, context)}${wrap(`${copy}<div class="hero-art">${media(section.image, { eager: true, cls: 'hero-photo', sizes: '(min-width: 900px) 46vw, 100vw', placeholderIcon: 'sparkles' })}</div>`, 'hero-grid')}</section>`;
  }
  return `${open(section, context)}${wrap(`${copy}${section.image ? `<div class="hero-art">${media(section.image, { eager: true, cls: 'hero-banner', sizes: '(min-width: 1200px) 1120px, 100vw', placeholderIcon: 'sparkles' })}</div>` : ''}`, 'hero-center')}</section>`;
}

function about(section: Extract<Section, { type: 'about' }>, context: SectionContext): string {
  const copy = `<div class="about-copy">${head(section.eyebrow, section.title, undefined)}${section.paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('')}${ticks(section.highlights)}</div>`;
  if (section.variant === 'text') return `${open(section, context)}${wrap(copy, 'about-text')}</section>`;
  const art = `<div class="about-art">${media(section.image, { cls: 'about-photo', placeholderIcon: 'heart' })}</div>`;
  return `${open(section, context)}${wrap(section.variant === 'image-left' ? `${art}${copy}` : `${copy}${art}`, 'about-grid')}</section>`;
}

function services(section: Extract<Section, { type: 'services' }>, context: SectionContext): string {
  const header = head(section.eyebrow, section.title, section.intro, { center: section.variant !== 'list' });
  if (section.variant === 'list') {
    return `${open(section, context)}${wrap(`${header}<ol class="svc-list">${section.items.map((item, index) => `<li><span class="svc-num" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p></div>${item.price ? `<span class="price">${esc(item.price)}</span>` : ''}</li>`).join('')}</ol>`)}</section>`;
  }
  const cards = section.items.map((item) => `<li class="svc-item"><span class="svc-icon">${icon(item.icon ?? 'check')}</span><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p>${item.price ? `<span class="price">${esc(item.price)}</span>` : ''}</li>`).join('');
  return `${open(section, context)}${wrap(`${header}<ul class="svc-grid cols-${Math.min(3, section.items.length)}">${cards}</ul>`)}</section>`;
}

function products(section: Extract<Section, { type: 'products' }>, context: SectionContext): string {
  const header = head(section.eyebrow, section.title, section.intro, { center: section.variant === 'grid' });
  if (section.variant === 'menu') {
    return `${open(section, context)}${wrap(`${header}<ul class="menu-list">${section.items.map((item) => `<li><div class="menu-row"><h3>${esc(item.name)}</h3><span class="leader" aria-hidden="true"></span>${item.price ? `<span class="price">${esc(item.price)}</span>` : ''}</div>${item.description ? `<p>${esc(item.description)}</p>` : ''}</li>`).join('')}</ul>`)}</section>`;
  }
  const withPhotos = section.items.some((item) => item.image);
  const card = (item: (typeof section.items)[number], cls = '') => `<li class="prod${withPhotos || cls ? '' : ' prod--plain'}${cls}">${withPhotos || cls ? media(item.image ?? { alt: item.name }, { cls: 'prod-photo', placeholderIcon: 'wheat', sizes: '(min-width: 900px) 33vw, 100vw' }) : ''}<div class="prod-body">${item.tag ? `<span class="tag">${esc(item.tag)}</span>` : ''}<div class="prod-line"><h3>${esc(item.name)}</h3>${item.price ? `<span class="price">${esc(item.price)}</span>` : ''}</div>${item.description ? `<p>${esc(item.description)}</p>` : ''}</div></li>`;
  if (section.variant === 'featured') {
    const [first, ...rest] = section.items;
    return `${open(section, context)}${wrap(`${header}<div class="prod-featured">${`<ul class="prod-main">${card(first, ' prod--big')}</ul>`}<ul class="prod-side">${rest.slice(0, 4).map((item) => `<li class="prod-mini"><div><h3>${esc(item.name)}</h3>${item.description ? `<p>${esc(item.description)}</p>` : ''}</div>${item.price ? `<span class="price">${esc(item.price)}</span>` : ''}</li>`).join('')}</ul></div>`)}</section>`;
  }
  return `${open(section, context)}${wrap(`${header}<ul class="prod-grid cols-${Math.min(3, section.items.length)}">${section.items.map((item) => card(item)).join('')}</ul>`)}</section>`;
}

function gallery(section: Extract<Section, { type: 'gallery' }>, context: SectionContext): string {
  const header = head(section.eyebrow, section.title, section.intro, { center: true });
  const ratios = ['ratio-tall', 'ratio-square', 'ratio-wide'];
  const figures = section.images.map((entry, index) => `<figure class="shot ${section.variant === 'masonry' ? ratios[index % ratios.length] : ''}">${media(entry.image, { cls: 'shot-media', placeholderIcon: 'camera', sizes: '(min-width: 900px) 33vw, 80vw' })}${entry.caption ? `<figcaption>${esc(entry.caption)}</figcaption>` : ''}</figure>`).join('');
  return `${open(section, context)}${wrap(`${header}<div class="gallery-${section.variant}">${figures}</div>`)}</section>`;
}

function testimonials(section: Extract<Section, { type: 'testimonials' }>, context: SectionContext): string {
  const header = head(section.eyebrow, section.title, undefined, { center: section.variant !== 'list' });
  const item = (entry: (typeof section.items)[number], cls = '') => `<figure class="quote${cls}">${entry.rating ? stars(entry.rating) : ''}<blockquote><p>${esc(entry.quote)}</p></blockquote><figcaption><span class="avatar" aria-hidden="true">${esc(entry.author.slice(0, 1).toUpperCase())}</span><span><strong>${esc(entry.author)}</strong>${entry.role ? `<span class="role">${esc(entry.role)}</span>` : ''}</span></figcaption></figure>`;
  if (section.variant === 'quote') {
    const [first, ...rest] = section.items;
    return `${open(section, context)}${wrap(`${header}${item(first, ' quote--big')}${rest.length ? `<div class="quote-row cols-${Math.min(3, rest.length)}">${rest.slice(0, 3).map((entry) => item(entry)).join('')}</div>` : ''}`)}</section>`;
  }
  return `${open(section, context)}${wrap(`${header}<div class="${section.variant === 'list' ? 'quote-list' : `quote-grid cols-${Math.min(3, section.items.length)}`}">${section.items.map((entry) => item(entry)).join('')}</div>`)}</section>`;
}

function stats(section: Extract<Section, { type: 'stats' }>, context: SectionContext): string {
  return `${open(section, context)}${wrap(`${head(section.eyebrow, section.title, undefined, { center: true })}<ul class="stat-grid cols-${section.items.length}">${section.items.map((entry) => `<li class="stat"><span class="stat-value">${esc(entry.value)}</span><span class="stat-label">${esc(entry.label)}</span></li>`).join('')}</ul>`)}</section>`;
}

function hours(section: Extract<Section, { type: 'hours' }>, context: SectionContext): string {
  const table = `<table class="hours-table"><caption class="sr-only">${esc(section.title)}</caption><tbody>${section.rows.map((row) => `<tr><th scope="row">${esc(row.day)}</th><td>${esc(row.hours)}</td></tr>`).join('')}</tbody></table>${section.note ? `<p class="note">${esc(section.note)}</p>` : ''}`;
  if (section.variant === 'card') return `${open(section, context)}${wrap(`${head(section.eyebrow, section.title, section.intro, { center: true })}<div class="hours-card">${icon('clock', 'hours-ic')}${table}</div>`)}</section>`;
  return `${open(section, context)}${wrap(`${head(section.eyebrow, section.title, section.intro)}<div class="hours-box">${table}</div>`, 'hours-grid')}</section>`;
}

function area(section: Extract<Section, { type: 'area' }>, context: SectionContext): string {
  const places = section.variant === 'chips'
    ? `<ul class="chips">${section.places.map((place) => `<li>${esc(place)}</li>`).join('')}</ul>`
    : `<ul class="place-cols">${section.places.map((place) => `<li>${icon('pin')}<span>${esc(place)}</span></li>`).join('')}</ul>`;
  return `${open(section, context)}${wrap(`${head(section.eyebrow, section.title, section.intro, { center: section.variant === 'chips' })}${places}${section.note ? `<p class="note${section.variant === 'chips' ? ' center' : ''}">${esc(section.note)}</p>` : ''}`)}</section>`;
}

function faq(section: Extract<Section, { type: 'faq' }>, context: SectionContext): string {
  const header = head(section.eyebrow, section.title, section.intro, { center: section.variant === 'accordion' });
  if (section.variant === 'columns') {
    return `${open(section, context)}${wrap(`${header}<div class="faq-cols">${section.items.map((entry) => `<div class="faq-item"><h3>${esc(entry.question)}</h3><p>${esc(entry.answer)}</p></div>`).join('')}</div>`)}</section>`;
  }
  return `${open(section, context)}${wrap(`${header}<div class="faq-list">${section.items.map((entry) => `<details><summary>${esc(entry.question)}${icon('chevron', 'faq-ic')}</summary><div class="faq-answer"><p>${esc(entry.answer)}</p></div></details>`).join('')}</div>`)}</section>`;
}

function team(section: Extract<Section, { type: 'team' }>, context: SectionContext): string {
  const header = head(section.eyebrow, section.title, section.intro, { center: section.variant === 'cards' });
  const photo = (member: (typeof section.members)[number]) => media(member.image ? member.image : { alt: member.name }, { cls: 'member-photo', placeholderText: initials(member.name), sizes: '240px' });
  const item = (member: (typeof section.members)[number]) => `<li class="member">${photo(member)}<div><h3>${esc(member.name)}</h3><p class="role">${esc(member.role)}</p>${member.bio ? `<p>${esc(member.bio)}</p>` : ''}</div></li>`;
  return `${open(section, context)}${wrap(`${header}<ul class="${section.variant === 'list' ? 'member-list' : `member-grid cols-${Math.min(3, section.members.length)}`}">${section.members.map(item).join('')}</ul>`)}</section>`;
}

function ctaSection(section: Extract<Section, { type: 'cta' }>, context: SectionContext): string {
  const copy = `<div class="cta-copy"><h2>${esc(section.title)}</h2>${section.text ? `<p class="lead">${esc(section.text)}</p>` : ''}</div>`;
  const buttons = `<div class="actions">${button(section.button, section.variant === 'banner' ? 'accent' : 'primary')}${section.secondary ? button(section.secondary, 'ghost') : ''}</div>`;
  return `${open(section, context)}${wrap(section.variant === 'card' ? `<div class="cta-card">${copy}${buttons}</div>` : `${copy}${buttons}`, 'cta-wrap')}</section>`;
}

function contactDetails(): string {
  return `<ul class="contact-list"><li data-company-opt="phone">${icon('phone')}<span><span class="k">Téléphone</span><a href="tel:{{company.phone}}">{{company.phone}}</a></span></li><li data-company-opt="email">${icon('mail')}<span><span class="k">Email</span><a href="mailto:{{company.email}}">{{company.email}}</a></span></li><li>${icon('pin')}<span><span class="k">Adresse</span>{{company.address}}</span></li></ul>`;
}

function contactForm(section: Extract<Section, { type: 'contact' }>): string {
  const quote = section.mode === 'quote';
  const select = quote && section.services?.length
    ? `<label>Prestation souhaitée<select name="prestation"><option value="">Choisir…</option>${section.services.map((service) => `<option>${esc(service)}</option>`).join('')}</select></label>`
    : '';
  return `<form class="form" method="post" action="mailto:{{company.email}}" enctype="text/plain"><div class="form-row"><label>Votre nom<input name="nom" autocomplete="name" required></label><label>Téléphone<input name="telephone" type="tel" autocomplete="tel"></label></div><label>Votre email<input name="email" type="email" autocomplete="email" required></label>${select}<label>${quote ? 'Décrivez votre projet' : 'Votre message'}<textarea name="message" rows="${quote ? 5 : 4}" required></textarea></label><button class="btn btn-primary" type="submit">${esc(section.submitLabel ?? (quote ? 'Demander mon devis' : 'Envoyer le message'))}</button><p class="form-note">Votre message s’ouvre dans votre application de messagerie.</p></form>`;
}

function contact(section: Extract<Section, { type: 'contact' }>, context: SectionContext): string {
  const header = head(section.eyebrow, section.title, section.intro, { center: section.variant !== 'split' });
  if (section.variant === 'details') return `${open(section, context)}${wrap(`${header}${contactDetails()}`, 'contact-details')}</section>`;
  if (section.variant === 'centered') return `${open(section, context)}${wrap(`${header}<div class="form-card">${contactForm(section)}</div>${contactDetails()}`, 'contact-centered')}</section>`;
  return `${open(section, context)}${wrap(`<div class="contact-info">${header}${contactDetails()}</div><div class="form-card">${contactForm(section)}</div>`, 'contact-split')}</section>`;
}

function mapSection(section: Extract<Section, { type: 'map' }>, context: SectionContext): string {
  const link = `<a class="btn btn-primary" href="https://www.openstreetmap.org/search?query={{company.address}}" target="_blank" rel="noopener">Voir sur la carte</a>`;
  const address = `<p class="address">${icon('pin')}<span>{{company.address}}</span></p>${section.access?.length ? `<ul class="access">${section.access.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>` : ''}${link}`;
  if (section.variant === 'split') {
    return `${open(section, context)}${wrap(`<div class="map-copy">${head(section.eyebrow, section.title, section.intro)}${address}</div><div class="map-art" aria-hidden="true"><span class="map-pin">${icon('pin')}</span></div>`, 'map-split')}</section>`;
  }
  return `${open(section, context)}${wrap(`${head(section.eyebrow, section.title, section.intro, { center: true })}<div class="map-card">${address}</div>`)}</section>`;
}

function footer(section: Extract<Section, { type: 'footer' }>, context: SectionContext, navLinks: { label: string; href: string }[]): string {
  const links = [...navLinks, ...(section.links ?? [])];
  const legal = `<a href="/mentions-legales">Mentions légales</a>`;
  const bottom = `<div class="foot-bottom"><span>© {{company.name}}</span>${legal}<span class="made">Site créé avec Mihoji</span></div>`;
  if (section.variant === 'simple') {
    return `<footer class="s s-footer s-footer--simple tone-inverse" id="${esc(context.id)}">${wrap(`<p class="foot-brand">{{company.name}}</p>${section.tagline ? `<p class="foot-tag">${esc(section.tagline)}</p>` : ''}${bottom}`)}</footer>`;
  }
  const nav = links.length ? `<nav aria-label="Pied de page"><p class="foot-h">Navigation</p><ul>${links.map((link) => `<li><a href="${esc(link.href)}">${esc(link.label)}</a></li>`).join('')}</ul></nav>` : '';
  const contactBlock = `<div><p class="foot-h">Contact</p><ul class="foot-contact"><li>{{company.address}}</li><li data-company-opt="phone"><a href="tel:{{company.phone}}">{{company.phone}}</a></li><li data-company-opt="email"><a href="mailto:{{company.email}}">{{company.email}}</a></li></ul></div>`;
  return `<footer class="s s-footer s-footer--columns tone-inverse" id="${esc(context.id)}">${wrap(`<div class="foot-grid"><div><p class="foot-brand">{{company.name}}</p>${section.tagline ? `<p class="foot-tag">${esc(section.tagline)}</p>` : ''}</div>${nav}${contactBlock}</div>${bottom}`)}</footer>`;
}

export function renderSection(section: Section, context: SectionContext, navLinks: { label: string; href: string }[]): string {
  switch (section.type) {
    case 'hero': return hero(section, context);
    case 'about': return about(section, context);
    case 'services': return services(section, context);
    case 'products': return products(section, context);
    case 'gallery': return gallery(section, context);
    case 'testimonials': return testimonials(section, context);
    case 'stats': return stats(section, context);
    case 'hours': return hours(section, context);
    case 'area': return area(section, context);
    case 'faq': return faq(section, context);
    case 'team': return team(section, context);
    case 'cta': return ctaSection(section, context);
    case 'contact': return contact(section, context);
    case 'map': return mapSection(section, context);
    case 'footer': return footer(section, context, navLinks);
  }
}
