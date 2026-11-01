import { pgTable, text, timestamp, uuid, integer, primaryKey, jsonb, numeric } from 'drizzle-orm/pg-core';

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

export const onboardingStates = pgTable('onboarding_states', {
  workspaceId: uuid('workspace_id').primaryKey().references(() => workspaces.id),
  kind: text('kind', { enum: ['business', 'agency'] }),
  step: text('step').notNull().default('kind'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().unique().references(() => workspaces.id),
  siret: text('siret').notNull().unique(),
  siren: text('siren').notNull(),
  name: text('name').notNull(),
  legalForm: text('legal_form').notNull(),
  address: text('address').notNull(),
  activity: text('activity').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  vatNumber: text('vat_number').notNull(),
  status: text('status', { enum: ['active', 'closed'] }).notNull(),
  missingFields: jsonb('missing_fields').notNull().default({}),
});

export const companyLookupCache = pgTable('company_lookup_cache', {
  query: text('query').primaryKey(),
  payload: jsonb('payload').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
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

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const publications = pgTable('publications', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  versionId: uuid('version_id').notNull().references(() => projectVersions.id),
  url: text('url').notNull(),
  status: text('status', { enum: ['pending', 'published', 'suspended', 'failed'] }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const abuseReports = pgTable('abuse_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  publicationId: uuid('publication_id').notNull().references(() => publications.id),
  reason: text('reason').notNull(),
  reporterEmail: text('reporter_email'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const supportRequests = pgTable('support_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status', { enum: ['open', 'closed'] }).notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const customDomains = pgTable('custom_domains', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  hostname: text('hostname').notNull().unique(),
  status: text('status', { enum: ['pending', 'active', 'failed'] }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const rateLimitEvents = pgTable('rate_limit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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

// Générations de sites par le modèle de design (phase Q, lot 2), avec leur coût réel en euros.
export const siteGenerations = pgTable('site_generations', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id'),
  task: text('task', { enum: ['create', 'restyle'] }).notNull(),
  request: text('request').notNull(),
  company: jsonb('company').notNull().default({}),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  status: text('status', { enum: ['succeeded', 'failed'] }).notNull(),
  attempts: integer('attempts').notNull().default(1),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  cacheReadTokens: integer('cache_read_tokens').notNull().default(0),
  cacheWriteTokens: integer('cache_write_tokens').notNull().default(0),
  durationMs: integer('duration_ms').notNull().default(0),
  shadowCostEur: numeric('shadow_cost_eur', { precision: 10, scale: 6, mode: 'number' }).notNull().default(0),
  site: jsonb('site'),
  error: text('error'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
