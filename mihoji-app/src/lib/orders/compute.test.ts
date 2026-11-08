import { describe, expect, it } from 'vitest';
import { modulesSchema, type SiteModules } from '../site/modules';
import { computeOrder, pickupTimes, quantitiesFromForm } from './compute';

type Shop = NonNullable<SiteModules['shop']>;
const shop: Shop = { mode: 'click-collect', products: [{ name: 'Pain au levain', price: 4.2 }, { name: 'Pièce montée', price: 78, preorderHours: 48 }, { name: 'Croissant', price: 1.4 }], pickup: { schedule: { days: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'], start: '07:00', end: '12:00' }, leadTimeHours: 2 }, payment: 'both', minimumOrder: 5 };
const now = new Date('2026-11-09T07:00:00Z'); // lundi 9 novembre, 8 h à Paris
const at = (date: string, time: string) => ({ date, time });

describe('commande click & collect', () => {
  it('calcule le total à partir des prix du site, en centimes', () => {
    const result = computeOrder(shop, { 0: 2, 2: 3 }, at('2026-11-10', '08:00'), 'online', now);
    expect(result.ok && result.totalCents).toBe(840 + 420);
    expect(result.ok && result.lines).toEqual([{ name: 'Pain au levain', unitCents: 420, quantity: 2 }, { name: 'Croissant', unitCents: 140, quantity: 3 }]);
    expect(result.ok && result.pickupAt.toISOString()).toBe('2026-11-10T07:00:00.000Z');
  });
  it('refuse : panier vide, quantité invalide ou excessive, produit inconnu, minimum de commande', () => {
    expect(computeOrder(shop, { 0: 0 }, at('2026-11-10', '08:00'), 'online', now)).toEqual({ ok: false, reason: 'empty' });
    for (const bad of [{ 0: -1 }, { 0: 21 }, { 0: 1.5 }, { 9: 1 }, { 0: Number.NaN }] as Record<number, number>[]) expect(computeOrder(shop, bad, at('2026-11-10', '08:00'), 'online', now), JSON.stringify(bad)).toEqual({ ok: false, reason: 'invalid_quantity' });
    expect(computeOrder(shop, { 2: 2 }, at('2026-11-10', '08:00'), 'online', now)).toEqual({ ok: false, reason: 'minimum', minimumCents: 500 });
  });
  it('retrait : jours et heures d’ouverture, délai du retrait, délai de la pièce la plus longue à préparer', () => {
    expect(pickupTimes(shop, '2026-11-10')).toHaveLength(10);
    expect(pickupTimes(shop, '2026-11-15')).toEqual([]); // dimanche
    expect(computeOrder(shop, { 0: 2 }, at('2026-11-15', '08:00'), 'online', now)).toEqual({ ok: false, reason: 'closed' });
    expect(computeOrder(shop, { 0: 2 }, at('2026-11-10', '08:15'), 'online', now)).toEqual({ ok: false, reason: 'closed' });
    expect(computeOrder(shop, { 0: 2 }, at('2026-11-09', '09:00'), 'online', now)).toEqual({ ok: false, reason: 'too_soon' });
    expect(computeOrder(shop, { 0: 2 }, at('2026-11-09', '10:00'), 'online', now).ok).toBe(true);
    expect(computeOrder(shop, { 1: 1 }, at('2026-11-10', '08:00'), 'online', now)).toEqual({ ok: false, reason: 'too_soon' }); // pièce montée : 48 h
    expect(computeOrder(shop, { 1: 1 }, at('2026-11-11', '09:00'), 'online', now).ok).toBe(true);
    expect(computeOrder(shop, { 0: 2 }, { date: 'demain', time: '8h' }, 'online', now)).toEqual({ ok: false, reason: 'invalid' });
  });
  it('paiement : imposé par le site, ou choisi par le client quand les deux existent', () => {
    const order = (payment: Shop['payment'], choice: string) => { const r = computeOrder({ ...shop, payment }, { 0: 2 }, at('2026-11-10', '08:00'), choice, now); return r.ok ? r.mode : r.reason; };
    expect(order('online', 'on_pickup')).toBe('online');
    expect(order('on-pickup', 'online')).toBe('on_pickup');
    expect(order('both', 'on_pickup')).toBe('on_pickup');
    expect(order('both', 'autre')).toBe('online');
  });
  it('livraison seule : aucun retrait possible', () => {
    expect(computeOrder({ ...shop, mode: 'delivery', pickup: undefined }, { 0: 2 }, at('2026-11-10', '08:00'), 'online', now)).toEqual({ ok: false, reason: 'no_pickup' });
  });
  it('lit les quantités du formulaire', () => {
    expect(quantitiesFromForm([['qty_0', '2'], ['qty_12', ''], ['nom', 'x'], ['qty_3', '1']])).toEqual({ 0: 2, 12: 0, 3: 1 });
  });
});

describe('catalogue de la boutique', () => {
  const product = (n: number) => ({ name: `Produit ${n}`, price: 1 });
  const base = { mode: 'click-collect' as const, pickup: shop.pickup, payment: 'online' as const };
  it('accepte jusqu’à 50 produits, refuse le 51e', () => {
    expect(modulesSchema.safeParse({ shop: { ...base, products: Array.from({ length: 50 }, (_, i) => product(i)) } }).success).toBe(true);
    expect(modulesSchema.safeParse({ shop: { ...base, products: Array.from({ length: 51 }, (_, i) => product(i)) } }).success).toBe(false);
  });
});
