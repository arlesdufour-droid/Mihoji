import { weekdays, type SiteModules } from '../site/modules';

// Créneaux de rendez-vous (logique pure, testée) : heures locales de Paris, jours d'ouverture, délai minimal, pas de chevauchement.
type BookingModule = NonNullable<SiteModules['booking']>;
const ZONE = 'Europe/Paris';

const pad = (value: number) => String(value).padStart(2, '0');
export const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
export const fromMinutes = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

// Instant UTC correspondant à une date et une heure locales de Paris (gère l'heure d'été).
export function parisInstant(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offsetAt = (instant: number) => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute)) - instant;
  };
  const first = guess - offsetAt(guess);
  return new Date(guess - offsetAt(first));
}

export function weekdayOf(date: string): (typeof weekdays)[number] {
  const [year, month, day] = date.split('-').map(Number);
  return weekdays[(new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7];
}

export type Busy = { startsAt: Date; durationMinutes: number };

export function slotStep(module: BookingModule): number {
  return module.slotMinutes ?? Math.min(...module.services.map((service) => service.durationMinutes));
}

// Heures de début possibles un jour donné pour un service (sans tenir compte des réservations déjà prises).
export function startTimes(module: BookingModule, date: string, durationMinutes: number): string[] {
  if (!module.schedule.days.includes(weekdayOf(date))) return [];
  const start = toMinutes(module.schedule.start);
  const end = toMinutes(module.schedule.end);
  const step = slotStep(module);
  const times: string[] = [];
  for (let at = start; at + durationMinutes <= end; at += step) times.push(fromMinutes(at));
  return times;
}

export type SlotCheck = { ok: true; startsAt: Date } | { ok: false; reason: 'closed' | 'too_soon' | 'taken' | 'unknown_service' | 'invalid' };

export function checkSlot(module: BookingModule, input: { service: string; date: string; time: string }, busy: Busy[], now: Date): SlotCheck {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return { ok: false, reason: 'invalid' };
  const service = module.services.find((candidate) => candidate.name === input.service);
  if (!service) return { ok: false, reason: 'unknown_service' };
  if (!startTimes(module, input.date, service.durationMinutes).includes(input.time)) return { ok: false, reason: 'closed' };
  const startsAt = parisInstant(input.date, input.time);
  if (startsAt.getTime() < now.getTime() + module.leadTimeHours * 3_600_000) return { ok: false, reason: 'too_soon' };
  const endsAt = startsAt.getTime() + service.durationMinutes * 60_000;
  if (busy.some((other) => startsAt.getTime() < other.startsAt.getTime() + other.durationMinutes * 60_000 && endsAt > other.startsAt.getTime())) return { ok: false, reason: 'taken' };
  return { ok: true, startsAt };
}

// Montants en centimes : prix du service, acompte (pourcentage) ou totalité ; un service gratuit ne demande aucun paiement.
export function amountsFor(module: BookingModule, serviceName: string): { totalCents: number; dueCents: number } {
  const service = module.services.find((candidate) => candidate.name === serviceName);
  const totalCents = Math.round((service?.price ?? 0) * 100);
  const dueCents = module.payment === 'full' ? totalCents : module.payment === 'deposit' ? Math.round(totalCents * (module.depositPercent ?? 0) / 100) : 0;
  return { totalCents, dueCents };
}
