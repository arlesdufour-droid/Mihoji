import { pgTable, text, timestamp, uuid, integer, primaryKey } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workspaceMembers = pgTable('workspace_members', {
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: text('role', { enum: ['owner', 'admin', 'member'] }).notNull().default('member'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.workspaceId, table.userId] })]);

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().unique().references(() => workspaces.id),
  planId: text('plan_id').notNull().default('starter'),
  creditsRemaining: integer('credits_remaining').notNull().default(136400),
  creditsUsed: integer('credits_used').notNull().default(2500000),
  monthlyAllowance: integer('monthly_allowance').notNull().default(1000000),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
