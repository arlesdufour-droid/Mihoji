import 'dotenv/config';
import { getDb } from '../src/db/client';
import { users, workspaces, workspaceMembers, subscriptions } from '../src/db/schema';

const userId = '00000000-0000-4000-8000-000000000001';
const workspaceId = '00000000-0000-4000-8000-000000000002';
const periodEnd = new Date('2026-11-28T22:41:00.000Z');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const db = getDb();
await db.insert(users).values({ id: userId, email: 'demo@mihoji.local', displayName: 'Mihoji Demo' }).onConflictDoNothing();
await db.insert(workspaces).values({ id: workspaceId, name: 'Mihoji Demo', ownerId: userId }).onConflictDoNothing();
await db.insert(workspaceMembers).values({ workspaceId, userId, role: 'owner' }).onConflictDoNothing();
await db.insert(subscriptions).values({
  workspaceId,
  planId: 'starter',
  creditsRemaining: 136400,
  creditsUsed: 2500000,
  monthlyAllowance: 1000000,
  periodEnd,
}).onConflictDoNothing();
console.log(`Seeded demo workspace ${workspaceId}.`);
