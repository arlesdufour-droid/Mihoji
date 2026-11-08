import 'server-only';

import { and, asc, eq, gt, inArray, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { bookings, companies, projects } from '@/db/schema';
import { readSecret } from '@/lib/connectors/store';
import { getMailer } from '@/lib/mailer/provider';
import { getPaymentsProvider } from '@/lib/payments';
import { loadProjectSite } from '@/lib/site/store';
import { bookingCustomerEmail, bookingMerchantEmail } from './email';
import type { BookingInput } from './schema';
import { amountsFor, checkSlot } from './slots';

export type CreateResult = { ok: true; redirect: string } | { ok: false; error: string };
const PENDING_MINUTES = 30; // un créneau en attente de paiement reste réservé 30 minutes

async function notify(bookingId: string, origin: string): Promise<void> {
  const db = getDb();
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return;
  const [company] = await db.select().from(companies).where(eq(companies.workspaceId, booking.workspaceId)).limit(1);
  const fields = company?.missingFields && typeof company.missingFields === 'object' ? company.missingFields as Record<string, string> : {};
  const info = { companyName: company?.name ?? 'votre commerçant', service: booking.service, startsAt: booking.startsAt, customerName: booking.customerName, customerEmail: booking.customerEmail, customerPhone: booking.customerPhone, paidCents: booking.stripePaymentIntentId ? booking.dueCents : 0, totalCents: booking.totalCents, notes: booking.notes };
  const mailer = getMailer();
  try {
    await mailer.send(bookingCustomerEmail(info));
    if (fields.email) await mailer.send(bookingMerchantEmail({ ...info, to: fields.email, inboxUrl: `${origin}/studio/${booking.projectId}/bookings` }));
  } catch (error) {
    console.error('Booking notification failed.', error);
  }
}

export async function createBooking(input: BookingInput, origin: string, now = new Date()): Promise<CreateResult> {
  const db = getDb();
  const [project] = await db.select({ id: projects.id, workspaceId: projects.workspaceId }).from(projects).where(eq(projects.id, input.site)).limit(1);
  if (!project) return { ok: false, error: 'unknown_site' };
  const site = await loadProjectSite(project.id);
  const plan = site?.modules?.booking;
  if (!plan) return { ok: false, error: 'no_booking' };
  const { totalCents, dueCents } = amountsFor(plan, input.service);
  const accountId: string | null = dueCents > 0 ? await readSecret(project.workspaceId, 'stripe') : null;
  if (dueCents > 0 && !accountId) return { ok: false, error: 'payment_unavailable' };
  const service = plan.services.find((candidate) => candidate.name === input.service);

  // Verrou par projet : deux visiteurs ne peuvent pas prendre le même créneau en même temps.
  const created: { id: string; error?: undefined } | { error: string; id?: undefined } = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${project.id}))`);
    const around = new Date(now.getTime() - 24 * 3_600_000);
    const existing = await tx.select({ startsAt: bookings.startsAt, durationMinutes: bookings.durationMinutes, status: bookings.status, createdAt: bookings.createdAt }).from(bookings)
      .where(and(eq(bookings.projectId, project.id), inArray(bookings.status, ['pending_payment', 'confirmed']), gt(bookings.startsAt, around)));
    const busy = existing.filter((row) => row.status === 'confirmed' || row.createdAt.getTime() > now.getTime() - PENDING_MINUTES * 60_000);
    const check = checkSlot(plan, { service: input.service, date: input.date, time: input.time }, busy, now);
    if (!check.ok) return { error: check.reason as string };
    const [row] = await tx.insert(bookings).values({ workspaceId: project.workspaceId, projectId: project.id, service: input.service, startsAt: check.startsAt, durationMinutes: service!.durationMinutes, customerName: input.nom, customerEmail: input.email, customerPhone: input.telephone, notes: input.notes, totalCents, dueCents, status: dueCents > 0 ? 'pending_payment' : 'confirmed', stripeAccountId: accountId ?? undefined }).returning({ id: bookings.id });
    return { id: row.id };
  });
  if (created.error !== undefined || !created.id) return { ok: false, error: created.error ?? 'invalid' };

  if (dueCents === 0) {
    await notify(created.id, origin);
    return { ok: true, redirect: `${origin}/api/public/bookings/done?b=${created.id}&ok=1` };
  }
  try {
    const checkout = await getPaymentsProvider(origin).createCheckout({ accountId: accountId!, amountCents: dueCents, currency: 'eur', description: `${plan.payment === 'full' ? 'Réservation' : 'Acompte'} — ${input.service}`, successUrl: `${origin}/api/public/bookings/done?b=${created.id}&ok=1`, cancelUrl: `${origin}/api/public/bookings/done?b=${created.id}&ok=0`, bookingId: created.id, customerEmail: input.email });
    await db.update(bookings).set({ stripeSessionId: checkout.id }).where(eq(bookings.id, created.id));
    return { ok: true, redirect: checkout.url };
  } catch (error) {
    console.error('Checkout could not be created.', error);
    await db.update(bookings).set({ status: 'cancelled' }).where(eq(bookings.id, created.id));
    return { ok: false, error: 'payment_error' };
  }
}

// Paiement réussi (webhook Stripe ou page de paiement simulée) : confirme le rendez-vous, une seule fois.
export async function confirmBooking(bookingId: string, paymentIntentId: string | null, origin: string): Promise<boolean> {
  const rows = await getDb().update(bookings).set({ status: 'confirmed', stripePaymentIntentId: paymentIntentId }).where(and(eq(bookings.id, bookingId), eq(bookings.status, 'pending_payment'))).returning({ id: bookings.id });
  if (!rows.length) return false;
  await notify(bookingId, origin);
  return true;
}

export async function cancelPendingBooking(bookingId: string): Promise<void> {
  await getDb().update(bookings).set({ status: 'cancelled' }).where(and(eq(bookings.id, bookingId), eq(bookings.status, 'pending_payment')));
}

export async function getBooking(id: string) {
  const [row] = await getDb().select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return row ?? null;
}

export async function listBookings(workspaceId: string, projectId: string) {
  return getDb().select().from(bookings).where(and(eq(bookings.workspaceId, workspaceId), eq(bookings.projectId, projectId), inArray(bookings.status, ['confirmed', 'cancelled', 'refunded']))).orderBy(asc(bookings.startsAt)).limit(300);
}

// Annulation par le commerçant ; si un acompte a été payé, il est remboursé sur son compte Stripe.
export async function cancelBooking(workspaceId: string, projectId: string, id: string, origin: string): Promise<{ ok: true; refunded: boolean } | { ok: false; error: 'not_found' | 'refund_failed' }> {
  const [row] = await getDb().select().from(bookings).where(and(eq(bookings.id, id), eq(bookings.workspaceId, workspaceId), eq(bookings.projectId, projectId))).limit(1);
  if (!row || row.status !== 'confirmed') return { ok: false, error: 'not_found' };
  let refunded = false;
  if (row.stripePaymentIntentId && row.stripeAccountId && row.dueCents > 0) {
    try {
      await getPaymentsProvider(origin).refund({ accountId: row.stripeAccountId, paymentIntentId: row.stripePaymentIntentId });
      refunded = true;
    } catch (error) {
      console.error('Refund failed.', error);
      return { ok: false, error: 'refund_failed' };
    }
  }
  await getDb().update(bookings).set({ status: refunded ? 'refunded' : 'cancelled' }).where(eq(bookings.id, id));
  return { ok: true, refunded };
}
