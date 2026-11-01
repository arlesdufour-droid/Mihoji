import { z } from 'zod';

// Modules fonctionnels d'un site : ce que le site FAIT (devis, rendez-vous, boutique…), en plus de ce qu'il affiche.
// Le schéma est complet dès le lot 2 pour que le modèle de design puisse les proposer ; leur fonctionnement réel
// (réception côté serveur, paiement Stripe Connect, emails, widgets, webhooks) arrive aux lots 7 et 8.
// En attendant, le rendu affiche le contenu (catalogue, créneaux, offres) et un bouton désactivé « Bientôt disponible ».

const text = (max: number) => z.string().trim().min(1).max(max);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'heure au format HH:MM');
// Prix en euros (ex. 4.5 pour 4,50 €).
const price = z.number().min(0).max(100_000);

export const weekdays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;
export type Weekday = (typeof weekdays)[number];

const openingSchema = z.object({
  days: z.array(z.enum(weekdays)).min(1).max(7),
  start: time,
  end: time,
}).refine((value) => value.start < value.end, { message: 'l’heure de début doit précéder l’heure de fin' });

export const quoteModuleSchema = z.object({
  // Prestations proposées dans la demande de devis.
  services: z.array(text(60)).min(1).max(12),
  // Informations demandées en plus du nom, de l'email, du téléphone et de la description.
  fields: z.array(z.enum(['address', 'date', 'budget', 'photos', 'surface'])).max(5).default([]),
  responseDelay: text(60),
  // Bouton d'appel immédiat pour les urgences (dépannage).
  emergency: z.boolean().default(false),
});

export const bookingModuleSchema = z.object({
  services: z.array(z.object({
    name: text(60),
    durationMinutes: z.number().int().min(10).max(480),
    price: price.optional(),
    location: z.enum(['onsite', 'home', 'remote', 'outdoor']).optional(),
  })).min(1).max(12),
  schedule: openingSchema,
  slotMinutes: z.number().int().min(10).max(240).optional(),
  // Délai minimal entre la réservation et le rendez-vous.
  leadTimeHours: z.number().int().min(0).max(168).default(12),
  cancellationPolicy: text(200).optional(),
  // Paiement à la réservation : aucun, acompte ou totalité (via le module de paiement, lot 7).
  payment: z.enum(['none', 'deposit', 'full']).default('none'),
  depositPercent: z.number().int().min(10).max(100).optional(),
  reminders: z.boolean().default(true),
});

export const shopModuleSchema = z.object({
  mode: z.enum(['click-collect', 'delivery', 'both']),
  products: z.array(z.object({
    name: text(60),
    description: text(170).optional(),
    price,
    unit: text(24).optional(),
    category: text(40).optional(),
    // Délai de commande à l'avance (ex. 48 h pour une pièce montée).
    preorderHours: z.number().int().min(0).max(336).optional(),
  })).min(1).max(40),
  pickup: z.object({ schedule: openingSchema, leadTimeHours: z.number().int().min(0).max(168).default(2) }).optional(),
  payment: z.enum(['online', 'on-pickup', 'both']).default('online'),
  minimumOrder: price.optional(),
});

export const paymentModuleSchema = z.object({
  offers: z.array(z.object({
    name: text(60),
    description: text(170).optional(),
    price,
    kind: z.enum(['one-off', 'pack', 'subscription', 'deposit']),
    sessions: z.number().int().min(1).max(100).optional(),
    period: z.enum(['month', 'year']).optional(),
  })).min(1).max(8),
});

export const newsletterModuleSchema = z.object({
  incentive: text(140).optional(),
  frequency: text(60),
});

export const clientAreaModuleSchema = z.object({
  features: z.array(z.enum(['documents', 'history', 'invoices', 'appointments', 'orders', 'programs'])).min(1).max(6),
});

export const widgetSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('google-maps') }),
  z.object({ type: z.literal('google-reviews') }),
  z.object({ type: z.literal('calendly'), url: z.string().trim().regex(/^https:\/\/calendly\.com\/[\w/-]+$/).optional() }),
  z.object({ type: z.literal('whatsapp'), message: text(140).optional() }),
  z.object({ type: z.literal('instagram'), handle: z.string().trim().regex(/^@?[\w.]{1,30}$/).optional() }),
]);
export type Widget = z.infer<typeof widgetSchema>;

export const webhookEvents = ['quote.created', 'booking.created', 'order.created', 'payment.succeeded', 'newsletter.subscribed', 'contact.created'] as const;
export const webhooksModuleSchema = z.object({ events: z.array(z.enum(webhookEvents)).min(1).max(webhookEvents.length) });

export const modulesSchema = z.object({
  quote: quoteModuleSchema.optional(),
  booking: bookingModuleSchema.optional(),
  shop: shopModuleSchema.optional(),
  payment: paymentModuleSchema.optional(),
  newsletter: newsletterModuleSchema.optional(),
  clientArea: clientAreaModuleSchema.optional(),
  widgets: z.array(widgetSchema).max(5).optional(),
  webhooks: webhooksModuleSchema.optional(),
}).superRefine((modules, context) => {
  const widgetTypes = (modules.widgets ?? []).map((widget) => widget.type);
  if (new Set(widgetTypes).size !== widgetTypes.length) context.addIssue({ code: 'custom', path: ['widgets'], message: 'un widget de chaque type au maximum' });
  if (modules.booking && modules.booking.payment !== 'none' && !modules.payment) context.addIssue({ code: 'custom', path: ['booking', 'payment'], message: 'un paiement à la réservation exige le module « payment »' });
  if (modules.booking?.payment === 'deposit' && !modules.booking.depositPercent) context.addIssue({ code: 'custom', path: ['booking', 'depositPercent'], message: 'pourcentage d’acompte requis' });
  if (modules.shop && modules.shop.mode !== 'delivery' && !modules.shop.pickup) context.addIssue({ code: 'custom', path: ['shop', 'pickup'], message: 'le click & collect exige des horaires de retrait' });
});
export type SiteModules = z.infer<typeof modulesSchema>;

// Modules qui s'affichent dans une section de page (les widgets et webhooks n'ont pas de section dédiée).
export const displayModules = ['quote', 'booking', 'shop', 'payment', 'newsletter', 'clientArea'] as const;
export type DisplayModule = (typeof displayModules)[number];

export const moduleLabels: Record<DisplayModule | 'widgets' | 'webhooks', string> = {
  quote: 'Demande de devis',
  booking: 'Prise de rendez-vous',
  shop: 'Boutique et commande',
  payment: 'Paiement en ligne',
  newsletter: 'Lettre d’information',
  clientArea: 'Espace client',
  widgets: 'Widgets',
  webhooks: 'Webhooks',
};

// Ancre par défaut de la section de chaque module (cible des appels à l'action).
export const moduleAnchors: Record<DisplayModule, string> = {
  quote: 'devis', booking: 'reservation', shop: 'commande', payment: 'tarifs', newsletter: 'newsletter', clientArea: 'espace-client',
};

export function activeModules(modules: SiteModules | undefined): (keyof SiteModules)[] {
  if (!modules) return [];
  return (Object.keys(modules) as (keyof SiteModules)[]).filter((key) => {
    const value = modules[key];
    return Array.isArray(value) ? value.length > 0 : value !== undefined;
  });
}

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
export function formatPrice(value: number): string {
  return euro.format(value).replace(/,00(\s?€)$/, '$1').replace(/[\u202f\s]/g, '\u00a0');
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`;
}

// « lundi, mardi, mercredi » → « du lundi au mercredi » quand les jours se suivent.
export function formatDays(days: readonly Weekday[]): string {
  const sorted = [...new Set(days)].sort((a, b) => weekdays.indexOf(a) - weekdays.indexOf(b));
  const indexes = sorted.map((day) => weekdays.indexOf(day));
  const consecutive = indexes.every((value, index) => index === 0 || value === indexes[index - 1] + 1);
  if (sorted.length === 7) return 'tous les jours';
  if (sorted.length >= 3 && consecutive) return `du ${sorted[0]} au ${sorted.at(-1)}`;
  if (sorted.length === 1) return `le ${sorted[0]}`;
  return `${sorted.slice(0, -1).join(', ')} et ${sorted.at(-1)}`;
}

export function formatTime(value: string): string {
  const [hours, minutes] = value.split(':');
  return `${Number(hours)} h${minutes === '00' ? '' : ` ${minutes}`}`;
}
