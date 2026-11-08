import 'server-only';

import { and, asc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { companies, orders, projects } from '@/db/schema';
import { readSecret } from '@/lib/connectors/store';
import { getMailer } from '@/lib/mailer/provider';
import { getPaymentsProvider } from '@/lib/payments';
import { loadProjectSite } from '@/lib/site/store';
import { computeOrder, quantitiesFromForm } from './compute';
import { orderCustomerEmail, orderMerchantEmail } from './email';

const clean = (max: number) => z.string().trim().max(max);
export const orderInputSchema = z.object({
  site: z.string().uuid(),
  date: clean(10), time: clean(5),
  nom: clean(120).min(1), email: clean(200).email(),
  telephone: clean(40).regex(/^[\d\s+().-]*$/).default(''),
  notes: clean(1000).default(''), pay: clean(12).default('online'), website: clean(200).default(''),
});
export type OrderInput = z.infer<typeof orderInputSchema>;

export const orderErrorMessages: Record<string, string> = {
  empty: 'Votre panier est vide : indiquez une quantité pour au moins un produit.',
  invalid_quantity: 'Une quantité n’est pas valide (de 0 à 20 par produit).',
  minimum: 'Le montant minimum de commande n’est pas atteint.',
  no_pickup: 'Le retrait en boutique n’est pas proposé sur ce site.',
  closed: 'Ce créneau de retrait est en dehors des horaires. Choisissez un autre jour ou une autre heure.',
  too_soon: 'Ce créneau de retrait est trop proche pour préparer votre commande : choisissez-en un plus tard.',
  invalid: 'Vérifiez la date et l’heure de retrait.',
  no_shop: 'La commande en ligne n’est pas activée sur ce site.',
  payment_unavailable: 'Le paiement en ligne n’est pas encore disponible pour ce site. Choisissez le paiement au retrait ou appelez-nous.',
  payment_error: 'Le paiement n’a pas pu démarrer. Réessayez dans quelques minutes.',
  unknown_site: 'Ce site n’existe plus.',
};

export type CreateOrderResult = { ok: true; redirect: string } | { ok: false; error: string };

async function notify(orderId: string, origin: string): Promise<void> {
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return;
  const [company] = await db.select().from(companies).where(eq(companies.workspaceId, order.workspaceId)).limit(1);
  const fields = company?.missingFields && typeof company.missingFields === 'object' ? company.missingFields as Record<string, string> : {};
  const info = { companyName: company?.name ?? 'votre commerçant', customerName: order.customerName, customerEmail: order.customerEmail, customerPhone: order.customerPhone, lines: order.lines, totalCents: order.totalCents, pickupAt: order.pickupAt, paid: Boolean(order.stripePaymentIntentId), notes: order.notes };
  try {
    await getMailer().send(orderCustomerEmail(info));
    if (fields.email) await getMailer().send(orderMerchantEmail({ ...info, to: fields.email, inboxUrl: `${origin}/studio/${order.projectId}/orders` }));
  } catch (error) {
    console.error('Order notification failed.', error);
  }
}

export async function createOrder(input: OrderInput, entries: [string, string][], origin: string, now = new Date()): Promise<CreateOrderResult> {
  const db = getDb();
  const [project] = await db.select({ id: projects.id, workspaceId: projects.workspaceId }).from(projects).where(eq(projects.id, input.site)).limit(1);
  if (!project) return { ok: false, error: 'unknown_site' };
  const shop = (await loadProjectSite(project.id))?.modules?.shop;
  if (!shop) return { ok: false, error: 'no_shop' };
  const check = computeOrder(shop, quantitiesFromForm(entries), { date: input.date, time: input.time }, input.pay, now);
  if (!check.ok) return { ok: false, error: check.reason };
  const online = check.mode === 'online';
  const accountId: string | null = online ? await readSecret(project.workspaceId, 'stripe') : null;
  if (online && !accountId) return { ok: false, error: 'payment_unavailable' };
  const [row] = await db.insert(orders).values({ workspaceId: project.workspaceId, projectId: project.id, customerName: input.nom, customerEmail: input.email, customerPhone: input.telephone, notes: input.notes, lines: check.lines, totalCents: check.totalCents, pickupAt: check.pickupAt, paymentMode: check.mode, status: online ? 'pending_payment' : 'confirmed', stripeAccountId: accountId ?? undefined }).returning({ id: orders.id });
  if (!online) {
    await notify(row.id, origin);
    return { ok: true, redirect: `${origin}/api/public/bookings/done?o=${row.id}&ok=1` };
  }
  try {
    const checkout = await getPaymentsProvider(origin).createCheckout({ accountId: accountId!, amountCents: check.totalCents, currency: 'eur', description: `Commande — ${check.lines.map((line) => `${line.quantity} × ${line.name}`).join(', ').slice(0, 200)}`, successUrl: `${origin}/api/public/bookings/done?o=${row.id}&ok=1`, cancelUrl: `${origin}/api/public/bookings/done?o=${row.id}&ok=0`, bookingId: row.id, customerEmail: input.email });
    await db.update(orders).set({ stripeSessionId: checkout.id }).where(eq(orders.id, row.id));
    return { ok: true, redirect: checkout.url };
  } catch (error) {
    console.error('Order checkout could not be created.', error);
    await db.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, row.id));
    return { ok: false, error: 'payment_error' };
  }
}

export async function confirmOrder(orderId: string, paymentIntentId: string | null, origin: string): Promise<boolean> {
  const rows = await getDb().update(orders).set({ status: 'confirmed', stripePaymentIntentId: paymentIntentId }).where(and(eq(orders.id, orderId), eq(orders.status, 'pending_payment'))).returning({ id: orders.id });
  if (!rows.length) return false;
  await notify(orderId, origin);
  return true;
}

export async function cancelPendingOrder(orderId: string): Promise<void> {
  await getDb().update(orders).set({ status: 'cancelled' }).where(and(eq(orders.id, orderId), eq(orders.status, 'pending_payment')));
}

export async function getOrder(id: string) {
  const [row] = await getDb().select().from(orders).where(eq(orders.id, id)).limit(1);
  return row ?? null;
}

export async function listOrders(workspaceId: string, projectId: string) {
  return getDb().select().from(orders).where(and(eq(orders.workspaceId, workspaceId), eq(orders.projectId, projectId), inArray(orders.status, ['confirmed', 'collected', 'cancelled', 'refunded']))).orderBy(asc(orders.pickupAt)).limit(300);
}

export async function markCollected(workspaceId: string, projectId: string, id: string): Promise<boolean> {
  const rows = await getDb().update(orders).set({ status: 'collected' }).where(and(eq(orders.id, id), eq(orders.workspaceId, workspaceId), eq(orders.projectId, projectId), eq(orders.status, 'confirmed'))).returning({ id: orders.id });
  return rows.length > 0;
}

// Annulation par le commerçant ; une commande payée en ligne est remboursée sur son compte Stripe.
export async function cancelOrder(workspaceId: string, projectId: string, id: string, origin: string): Promise<{ ok: true; refunded: boolean } | { ok: false; error: 'not_found' | 'refund_failed' }> {
  const [row] = await getDb().select().from(orders).where(and(eq(orders.id, id), eq(orders.workspaceId, workspaceId), eq(orders.projectId, projectId))).limit(1);
  if (!row || row.status !== 'confirmed') return { ok: false, error: 'not_found' };
  let refunded = false;
  if (row.stripePaymentIntentId && row.stripeAccountId) {
    try {
      await getPaymentsProvider(origin).refund({ accountId: row.stripeAccountId, paymentIntentId: row.stripePaymentIntentId });
      refunded = true;
    } catch (error) {
      console.error('Order refund failed.', error);
      return { ok: false, error: 'refund_failed' };
    }
  }
  await getDb().update(orders).set({ status: refunded ? 'refunded' : 'cancelled' }).where(eq(orders.id, id));
  return { ok: true, refunded };
}
