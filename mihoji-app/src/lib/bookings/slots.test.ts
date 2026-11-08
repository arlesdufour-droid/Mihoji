import { describe, expect, it } from 'vitest';
import { amountsFor, checkSlot, parisInstant, startTimes, weekdayOf } from './slots';
import type { SiteModules } from '../site/modules';

type Booking = NonNullable<SiteModules['booking']>;
const schedule: Booking = { services: [{ name: 'Séance découverte', durationMinutes: 60, price: 50 }, { name: 'Bilan offert', durationMinutes: 30, price: 0 }], schedule: { days: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'], start: '09:00', end: '12:00' }, slotMinutes: 60, leadTimeHours: 12, payment: 'deposit', depositPercent: 30, reminders: true };
const now = new Date('2026-11-09T08:00:00Z'); // lundi 9 novembre 2026, 9 h à Paris

describe('créneaux', () => {
  it('Paris : heure d’hiver (UTC+1) et d’été (UTC+2)', () => {
    expect(parisInstant('2026-11-10', '10:00').toISOString()).toBe('2026-11-10T09:00:00.000Z');
    expect(parisInstant('2026-07-10', '10:00').toISOString()).toBe('2026-07-10T08:00:00.000Z');
  });
  it('jour de la semaine', () => { expect(weekdayOf('2026-11-09')).toBe('lundi'); expect(weekdayOf('2026-11-15')).toBe('dimanche'); });
  it('propose les heures de début qui tiennent dans les horaires', () => {
    expect(startTimes(schedule, '2026-11-10', 60)).toEqual(['09:00', '10:00', '11:00']);
    expect(startTimes(schedule, '2026-11-14', 60)).toEqual([]); // samedi fermé
  });
  it('accepte un créneau libre dans les horaires', () => {
    const result = checkSlot(schedule, { service: 'Séance découverte', date: '2026-11-10', time: '10:00' }, [], now);
    expect(result.ok && result.startsAt.toISOString()).toBe('2026-11-10T09:00:00.000Z');
  });
  it('refuse : fermé, trop tôt (délai de 12 h), déjà pris, service inconnu, format invalide', () => {
    const base = { service: 'Séance découverte', date: '2026-11-10', time: '10:00' };
    expect(checkSlot(schedule, { ...base, date: '2026-11-14' }, [], now)).toEqual({ ok: false, reason: 'closed' });
    expect(checkSlot(schedule, { ...base, time: '10:30' }, [], now)).toEqual({ ok: false, reason: 'closed' });
    expect(checkSlot(schedule, { ...base, date: '2026-11-09', time: '11:00' }, [], now)).toEqual({ ok: false, reason: 'too_soon' });
    expect(checkSlot(schedule, base, [{ startsAt: new Date('2026-11-10T09:00:00Z'), durationMinutes: 60 }], now)).toEqual({ ok: false, reason: 'taken' });
    expect(checkSlot(schedule, { ...base, service: 'Autre' }, [], now)).toEqual({ ok: false, reason: 'unknown_service' });
    expect(checkSlot(schedule, { ...base, date: 'demain' }, [], now)).toEqual({ ok: false, reason: 'invalid' });
  });
  it('un créneau voisin (qui commence à la fin du précédent) reste libre', () => {
    const busy = [{ startsAt: new Date('2026-11-10T09:00:00Z'), durationMinutes: 60 }];
    expect(checkSlot(schedule, { service: 'Séance découverte', date: '2026-11-10', time: '11:00' }, busy, now).ok).toBe(true);
  });
  it('acompte en pourcentage, totalité, ou rien pour un service gratuit', () => {
    expect(amountsFor(schedule, 'Séance découverte')).toEqual({ totalCents: 5000, dueCents: 1500 });
    expect(amountsFor(schedule, 'Bilan offert')).toEqual({ totalCents: 0, dueCents: 0 });
    expect(amountsFor({ ...schedule, payment: 'full' }, 'Séance découverte')).toEqual({ totalCents: 5000, dueCents: 5000 });
    expect(amountsFor({ ...schedule, payment: 'none' }, 'Séance découverte').dueCents).toBe(0);
  });
});
