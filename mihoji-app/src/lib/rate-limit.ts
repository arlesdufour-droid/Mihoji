import { and, eq, lt } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { rateLimitEvents } from '@/db/schema';

export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const cutoff = new Date(Date.now() - windowMs);
  const db = getDb();
  await db.delete(rateLimitEvents).where(and(eq(rateLimitEvents.key, key), lt(rateLimitEvents.createdAt, cutoff)));
  const events = await db.select({ id: rateLimitEvents.id }).from(rateLimitEvents).where(eq(rateLimitEvents.key, key));
  if (events.length >= limit) return false;
  await db.insert(rateLimitEvents).values({ key });
  return true;
}
