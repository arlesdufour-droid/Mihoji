import { fromMinutes, parisInstant, toMinutes, weekdayOf } from '../bookings/slots';
import type { SiteModules } from '../site/modules';

// Calcul d'une commande click & collect (logique pure, testée) : les prix viennent TOUJOURS du site enregistré, jamais du navigateur.
type Shop = NonNullable<SiteModules['shop']>;
export const MAX_QUANTITY = 20;
export const PICKUP_STEP_MINUTES = 30;

export type OrderLine = { name: string; unitCents: number; quantity: number };
export type OrderReason = 'empty' | 'invalid_quantity' | 'minimum' | 'no_pickup' | 'closed' | 'too_soon' | 'invalid';
export type OrderCheck = { ok: true; lines: OrderLine[]; totalCents: number; pickupAt: Date; mode: 'online' | 'on_pickup' } | { ok: false; reason: OrderReason; minimumCents?: number };

export function pickupTimes(shop: Shop, date: string): string[] {
  if (!shop.pickup || !shop.pickup.schedule.days.includes(weekdayOf(date))) return [];
  const times: string[] = [];
  for (let at = toMinutes(shop.pickup.schedule.start); at < toMinutes(shop.pickup.schedule.end); at += PICKUP_STEP_MINUTES) times.push(fromMinutes(at));
  return times;
}

export function computeOrder(shop: Shop, quantities: Record<number, number>, pickup: { date: string; time: string }, payChoice: string, now: Date): OrderCheck {
  if (shop.mode === 'delivery' || !shop.pickup) return { ok: false, reason: 'no_pickup' };
  const lines: OrderLine[] = [];
  for (const [key, quantity] of Object.entries(quantities)) {
    const index = Number(key);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY || !Number.isInteger(index) || index < 0 || index >= shop.products.length) return { ok: false, reason: 'invalid_quantity' };
    if (quantity > 0) lines.push({ name: shop.products[index].name, unitCents: Math.round(shop.products[index].price * 100), quantity });
  }
  if (!lines.length) return { ok: false, reason: 'empty' };
  const totalCents = lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
  if (shop.minimumOrder && totalCents < Math.round(shop.minimumOrder * 100)) return { ok: false, reason: 'minimum', minimumCents: Math.round(shop.minimumOrder * 100) };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickup.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(pickup.time)) return { ok: false, reason: 'invalid' };
  if (!pickupTimes(shop, pickup.date).includes(pickup.time)) return { ok: false, reason: 'closed' };
  const pickupAt = parisInstant(pickup.date, pickup.time);
  // Délai : celui du retrait, ou celui de la pièce la plus longue à préparer (ex. 48 h pour une pièce montée).
  const leadHours = Math.max(shop.pickup.leadTimeHours, ...lines.map((line) => shop.products.find((product) => product.name === line.name)?.preorderHours ?? 0));
  if (pickupAt.getTime() < now.getTime() + leadHours * 3_600_000) return { ok: false, reason: 'too_soon' };
  const mode = shop.payment === 'on-pickup' ? 'on_pickup' : shop.payment === 'online' ? 'online' : payChoice === 'on_pickup' ? 'on_pickup' : 'online';
  return { ok: true, lines, totalCents, pickupAt, mode };
}

// Quantités lues dans les champs « qty_<index> » d'un formulaire.
export function quantitiesFromForm(entries: Iterable<[string, string]>): Record<number, number> {
  const quantities: Record<number, number> = {};
  for (const [key, value] of entries) {
    const match = key.match(/^qty_(\d{1,2})$/);
    if (!match) continue;
    quantities[Number(match[1])] = value.trim() === '' ? 0 : Number(value);
  }
  return quantities;
}
