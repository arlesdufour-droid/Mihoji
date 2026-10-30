import { rmSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import type { FullConfig } from '@playwright/test';
import { assertE2eEnvironment, E2E_EMAIL_LIKE, E2E_LEGACY_EMAIL_LIKES, loadEnv } from '../scripts/e2e-guard';

export default async function globalTeardown(_config: FullConfig) {
  void _config;
  loadEnv();
  assertE2eEnvironment();
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const patterns = [E2E_EMAIL_LIKE, ...E2E_LEGACY_EMAIL_LIKES];
  const testUsers = await sql<{ id: string; email: string }[]>`select id, email from users where ${patterns.map((pattern) => sql`email like ${pattern}`).reduce((acc, condition) => sql`${acc} or ${condition}`)}`;
  for (const user of testUsers) {
    const workspaceIds = (await sql<{ id: string }[]>`select id from workspaces where owner_id = ${user.id}`).map((row) => row.id);
    if (workspaceIds.length > 0) {
      const projectIds = (await sql<{ id: string }[]>`select id from projects where workspace_id in ${sql(workspaceIds)}`).map((row) => row.id);
      if (projectIds.length > 0) {
        await sql`delete from abuse_reports where publication_id in (select id from publications where project_id in ${sql(projectIds)})`;
        await sql`delete from publications where project_id in ${sql(projectIds)}`;
        await sql`delete from chat_messages where project_id in ${sql(projectIds)}`;
        await sql`delete from custom_domains where project_id in ${sql(projectIds)}`;
        await sql`delete from project_files where project_id in ${sql(projectIds)}`;
        await sql`delete from project_versions where project_id in ${sql(projectIds)}`;
        await sql`delete from projects where id in ${sql(projectIds)}`;
      }
      await sql`delete from credit_ledger where workspace_id in ${sql(workspaceIds)}`;
      await sql`delete from support_requests where workspace_id in ${sql(workspaceIds)}`;
      await sql`delete from subscriptions where workspace_id in ${sql(workspaceIds)}`;
      await sql`delete from onboarding_states where workspace_id in ${sql(workspaceIds)}`;
      await sql`delete from companies where workspace_id in ${sql(workspaceIds)}`;
      await sql`delete from workspace_members where workspace_id in ${sql(workspaceIds)}`;
      await sql`delete from workspaces where id in ${sql(workspaceIds)}`;
    }
    await sql`delete from workspace_members where user_id = ${user.id}`;
    await sql`delete from users where id = ${user.id}`;
  }
  await sql.end();
  if (testUsers.length > 0) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    for (const user of testUsers) {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error && !/not found/i.test(error.message)) console.error(`Suppression du compte auth ${user.email} impossible.`, error);
    }
    console.log(`${testUsers.length} utilisateur(s) de test supprimé(s).`);
  }
  rmSync('e2e/.state.json', { force: true });
}
