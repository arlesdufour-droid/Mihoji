import { pgTable, text, timestamp, uuid, integer, primaryKey, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  uiMode: text('ui_mode', { enum: ['simple', 'expert'] }).notNull().default('simple'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  kind: text('kind', { enum: ['business', 'agency'] }).notNull().default('business'),
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
  creditsRemaining: integer('credits_remaining').notNull().default(0),
  creditsUsed: integer('credits_used').notNull().default(0),
  monthlyAllowance: integer('monthly_allowance').notNull().default(1000000),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  status: text('status', { enum: ['active', 'past_due', 'canceled', 'trialing'] }).notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const stripeEvents = pgTable('stripe_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  name: text('name').notNull(),
  currentVersionId: uuid('current_version_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const fileBlobs = pgTable('file_blobs', {
  hash: text('hash').primaryKey(),
  content: text('content').notNull(),
});

export const projectFiles = pgTable('project_files', {
  projectId: uuid('project_id').notNull().references(() => projects.id),
  path: text('path').notNull(),
  hash: text('hash').notNull().references(() => fileBlobs.hash),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.projectId, table.path] })]);

export const projectVersions = pgTable('project_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  parentVersionId: uuid('parent_version_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by', { enum: ['user', 'agent'] }).notNull(),
  summary: text('summary').notNull(),
  filesSnapshot: jsonb('files_snapshot').notNull(),
  status: text('status', { enum: ['draft', 'built', 'failed', 'published'] }).notNull(),
});

export const creditLedger = pgTable('credit_ledger', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  projectId: uuid('project_id'),
  versionId: uuid('version_id'),
  task: text('task').notNull(),
  model: text('model').notNull(),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  amount: integer('amount').notNull(),
  shadowCost: integer('shadow_cost').notNull().default(0),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
