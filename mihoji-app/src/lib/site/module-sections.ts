import { esc, head, icon } from './html';
import { formatDays, formatDuration, formatPrice, formatTime, type SiteModules } from './modules';
import type { Section } from './schema';

type ModuleSection = Extract<Section, { type: 'module' }>;

// Bouton d'une fonction pas encore active : désactivé, avec la mention « Bientôt disponible » (jamais un bouton sans action).
function soon(label: string): string {
  return `<div class="mod-soon"><button class="btn btn-soon" type="button" disabled>${esc(label)}</button><span class="soon-badge">Bientôt disponible</span></div>`;
}

// En attendant le module en ligne (lot 7), le visiteur peut toujours joindre l'entreprise.
function fallback(intro: string): string {
  return `<ul class="mod-fallback"><li class="k">${esc(intro)}</li><li data-company-opt="phone">${icon('phone')}<a href="tel:{{company.phone}}">{{company.phone}}</a></li><li data-company-opt="email">${icon('mail')}<a href="mailto:{{company.email}}">{{company.email}}</a></li></ul>`;
}

const LOCATIONS = { onsite: 'Au cabinet', home: 'À domicile', remote: 'En visio', outdoor: 'En extérieur' } as const;
const FIELDS = { address: 'Adresse du chantier', date: 'Date souhaitée', budget: 'Budget indicatif', photos: 'Photos (lien ou description)', surface: 'Surface (m²)' } as const;
const FEATURES = { documents: 'Vos documents', history: 'Votre historique', invoices: 'Vos factures', appointments: 'Vos rendez-vous', orders: 'Vos commandes', programs: 'Vos programmes' } as const;
const KINDS = { 'one-off': 'Paiement unique', pack: 'Forfait', subscription: 'Abonnement', deposit: 'Acompte' } as const;

function schedule(value: { days: Parameters<typeof formatDays>[0]; start: string; end: string }): string {
  return `${formatDays(value.days)}, ${formatTime(value.start)} – ${formatTime(value.end)}`;
}

function quote(module: NonNullable<SiteModules['quote']>): { body: string; aside: string } {
  const extra = module.fields.map((field) => field === 'date'
    ? `<label>${FIELDS[field]}<input name="${field}" type="date"></label>`
    : `<label>${FIELDS[field]}<input name="${field}"${field === 'budget' || field === 'surface' ? ' inputmode="numeric"' : ''}></label>`).join('');
  const form = `<form class="form" method="post" action="mailto:{{company.email}}" enctype="text/plain"><div class="form-row"><label>Votre nom<input name="nom" autocomplete="name" required></label><label>Téléphone<input name="telephone" type="tel" autocomplete="tel"></label></div><label>Votre email<input name="email" type="email" autocomplete="email" required></label><label>Prestation<select name="prestation" required><option value="">Choisir…</option>${module.services.map((service) => `<option>${esc(service)}</option>`).join('')}</select></label>${extra}<label>Décrivez votre besoin<textarea name="message" rows="5" required></textarea></label><button class="btn btn-primary" type="submit">Demander mon devis</button><p class="form-note">Votre demande s’ouvre dans votre application de messagerie.</p></form>`;
  const emergency = module.emergency ? `<ul class="mod-fallback"><li class="k">Urgence ?</li><li data-company-opt="phone">${icon('phone')}<a href="tel:{{company.phone}}">Appeler le {{company.phone}}</a></li></ul>` : '';
  return {
    body: `<div class="form-card">${form}</div>`,
    aside: `<p class="mod-promise">${icon('clock')}<span>${esc(module.responseDelay)}</span></p><ul class="ticks">${module.services.map((service) => `<li>${icon('check')}<span>${esc(service)}</span></li>`).join('')}</ul>${emergency}`,
  };
}

function booking(module: NonNullable<SiteModules['booking']>): { body: string; aside: string } {
  const rows = module.services.map((service) => `<li class="mod-row"><div><h3>${esc(service.name)}</h3><p>${formatDuration(service.durationMinutes)}${service.location ? ` · ${LOCATIONS[service.location]}` : ''}</p></div>${service.price !== undefined ? `<span class="price">${service.price === 0 ? 'Offert' : formatPrice(service.price)}</span>` : ''}</li>`).join('');
  const payment = module.payment === 'full' ? 'Paiement en ligne à la réservation.' : module.payment === 'deposit' ? `Acompte de ${module.depositPercent} % à la réservation.` : 'Règlement sur place.';
  const facts = [
    `${icon('calendar')}<span>Rendez-vous ${schedule(module.schedule)}</span>`,
    `${icon('clock')}<span>Réservation au moins ${module.leadTimeHours} h à l’avance${module.reminders ? ', rappel envoyé la veille' : ''}.</span>`,
    `${icon('shield')}<span>${esc(payment)}${module.cancellationPolicy ? ` ${esc(module.cancellationPolicy)}` : ''}</span>`,
  ];
  return {
    body: `<ul class="mod-list">${rows}</ul>`,
    aside: `<ul class="mod-facts">${facts.map((fact) => `<li>${fact}</li>`).join('')}</ul>${soon('Réserver en ligne')}${fallback('En attendant, réservez par téléphone ou par email :')}`,
  };
}

function shop(module: NonNullable<SiteModules['shop']>): { body: string; aside: string } {
  const categories = [...new Set(module.products.map((product) => product.category ?? ''))];
  const list = categories.map((category) => {
    const items = module.products.filter((product) => (product.category ?? '') === category).map((product) => `<li class="mod-row"><div><h3>${esc(product.name)}</h3>${product.description ? `<p>${esc(product.description)}</p>` : ''}${product.preorderHours ? `<p class="mod-note">À commander ${product.preorderHours} h à l’avance</p>` : ''}</div><span class="price">${formatPrice(product.price)}${product.unit ? `<small> / ${esc(product.unit)}</small>` : ''}</span></li>`).join('');
    return `${category ? `<h3 class="mod-cat">${esc(category)}</h3>` : ''}<ul class="mod-list">${items}</ul>`;
  }).join('');
  const mode = module.mode === 'click-collect' ? 'Commandez en ligne, retirez en boutique.' : module.mode === 'delivery' ? 'Commandez en ligne, nous livrons.' : 'Retrait en boutique ou livraison.';
  const facts = [
    `${icon('bag')}<span>${mode}</span>`,
    ...(module.pickup ? [`${icon('clock')}<span>Retrait ${schedule(module.pickup.schedule)}, dès ${module.pickup.leadTimeHours} h après la commande.</span>`] : []),
    `${icon('shield')}<span>${module.payment === 'on-pickup' ? 'Paiement au retrait.' : module.payment === 'both' ? 'Paiement en ligne ou au retrait.' : 'Paiement sécurisé en ligne.'}${module.minimumOrder ? ` Commande minimum : ${formatPrice(module.minimumOrder)}.` : ''}</span>`,
  ];
  return {
    body: list,
    aside: `<ul class="mod-facts">${facts.map((fact) => `<li>${fact}</li>`).join('')}</ul>${soon('Commander en ligne')}${fallback('En attendant, commandez par téléphone :')}`,
  };
}

function payment(module: NonNullable<SiteModules['payment']>): { body: string; aside: string } {
  const offers = module.offers.map((offer) => `<li class="mod-offer"><span class="tag">${KINDS[offer.kind]}</span><h3>${esc(offer.name)}</h3><p class="mod-price">${formatPrice(offer.price)}${offer.period ? `<small> / ${offer.period === 'month' ? 'mois' : 'an'}</small>` : ''}</p>${offer.sessions ? `<p>${offer.sessions} séance${offer.sessions > 1 ? 's' : ''}</p>` : ''}${offer.description ? `<p>${esc(offer.description)}</p>` : ''}</li>`).join('');
  return {
    body: `<ul class="mod-offers cols-${Math.min(3, module.offers.length)}">${offers}</ul>`,
    aside: `${soon('Payer en ligne')}${fallback('En attendant, contactez-nous pour régler :')}`,
  };
}

function newsletter(module: NonNullable<SiteModules['newsletter']>): { body: string; aside: string } {
  return {
    body: `<div class="mod-news">${module.incentive ? `<p class="lead">${esc(module.incentive)}</p>` : ''}<p class="mod-note">${esc(module.frequency)} · Désinscription en un clic.</p></div>`,
    aside: soon('S’inscrire'),
  };
}

function clientArea(module: NonNullable<SiteModules['clientArea']>): { body: string; aside: string } {
  return {
    body: `<ul class="ticks">${module.features.map((feature) => `<li>${icon('check')}<span>${FEATURES[feature]}</span></li>`).join('')}</ul>`,
    aside: soon('Se connecter'),
  };
}

function content(section: ModuleSection, modules: SiteModules): { body: string; aside: string } | null {
  switch (section.module) {
    case 'quote': return modules.quote ? quote(modules.quote) : null;
    case 'booking': return modules.booking ? booking(modules.booking) : null;
    case 'shop': return modules.shop ? shop(modules.shop) : null;
    case 'payment': return modules.payment ? payment(modules.payment) : null;
    case 'newsletter': return modules.newsletter ? newsletter(modules.newsletter) : null;
    case 'clientArea': return modules.clientArea ? clientArea(modules.clientArea) : null;
  }
}

export function moduleSection(section: ModuleSection, modules: SiteModules | undefined, open: string): string {
  const parts = modules ? content(section, modules) : null;
  if (!parts) return '';
  const header = head(section.eyebrow, section.title, section.intro, { center: section.variant === 'panel' });
  const layout = section.variant === 'split'
    ? `<div class="mod-split"><div class="mod-side">${header}${parts.aside}</div><div class="mod-main">${parts.body}</div></div>`
    : `${header}<div class="mod-panel"><div class="mod-main">${parts.body}</div><div class="mod-side">${parts.aside}</div></div>`;
  return `${open}<div class="wrap mod mod-${section.module}">${layout}</div></section>`;
}
