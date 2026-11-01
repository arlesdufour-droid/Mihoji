import { createHash, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import type { FullConfig } from '@playwright/test';
import { assertE2eEnvironment, E2E_EMAIL_DOMAIN, E2E_EMAIL_PREFIX, loadEnv } from '../scripts/e2e-guard';

export default async function globalSetup(_config: FullConfig) {
  void _config;
  loadEnv();
  assertE2eEnvironment();
  const email = `${E2E_EMAIL_PREFIX}${Date.now()}@${E2E_EMAIL_DOMAIN}`;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const created = await supabase.auth.admin.createUser({ email, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error('e2e_user_creation_failed');
  const userId = created.data.user.id;
  const siret = String(Date.now()).slice(-9).padStart(9, '3') + String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  const workspaceId = randomUUID();
  const projectId = randomUUID();
  let legacyProjectId = '';
  const versionId = randomUUID();
  const seedHtml = '<main><h1>{{company.name}}</h1><p>Activité : {{company.activity}}</p><p>Forme : {{company.legalForm}}</p><p>Code historique : 10.71C</p><p>Adresse : {{company.address}}</p><p>Contact : {{company.email}} — {{company.phone}}</p></main>';
  const hash = createHash('sha256').update(seedHtml).digest('hex');
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  await sql.begin(async (tx) => {
    await tx`insert into users (id, email) values (${userId}, ${email}) on conflict (id) do update set email = excluded.email`;
    await tx`insert into workspaces (id, name, owner_id) values (${workspaceId}, 'Espace E2E réel', ${userId})`;
    await tx`insert into workspace_members (workspace_id, user_id, role) values (${workspaceId}, ${userId}, 'owner')`;
    await tx`insert into subscriptions (workspace_id, plan_id, credits_remaining, credits_used, monthly_allowance, period_end) values (${workspaceId}, 'free', 100000, 0, 100000, now() + interval '30 days')`;
    await tx`insert into companies (workspace_id, siret, siren, name, legal_form, address, activity, vat_number, status, missing_fields) values (${workspaceId}, ${siret}, ${siret.slice(0, 9)}, 'Boulangerie E2E', 'SAS, société par actions simplifiée', '1 rue du Test, 17000 La Rochelle', 'Boulangerie et boulangerie-pâtisserie', 'FR12356000000', 'active', ${JSON.stringify({ email: 'contact@e2e.test', phone: '0500000000' })})`;
    await tx`insert into projects (id, workspace_id, name, current_version_id) values (${projectId}, ${workspaceId}, 'Projet E2E', ${versionId})`;
    await tx`insert into file_blobs (hash, content) values (${hash}, ${seedHtml}) on conflict (hash) do nothing`;
    await tx`insert into project_files (project_id, path, hash) values (${projectId}, 'index.html', ${hash})`;
    await tx`insert into project_versions (id, project_id, created_by, summary, files_snapshot, status) values (${versionId}, ${projectId}, 'agent', 'Version E2E', ${JSON.stringify({ 'index.html': hash })}, 'built')`;
    await tx`insert into publications (project_id, version_id, url, status) values (${projectId}, ${versionId}, 'https://e2e.mihoji.app', 'published'), (${projectId}, ${versionId}, 'https://e2e.mihoji.app', 'published')`;
    // Projet « pré-migration » : coordonnées figées en dur, comme avant la migration 0015.
    legacyProjectId = randomUUID();
    const legacyVersionId = randomUUID();
    const legacyHtml = '<main><h1>{{company.name}}</h1><div class="rounded-xl bg-slate-100 p-5"><p class="text-sm font-semibold text-slate-500">Contact</p><p class="mt-2">{{company.email}}<br />{{company.phone}}</p></div></main>';
    const legacyHash = createHash('sha256').update(legacyHtml).digest('hex');
    await tx`insert into projects (id, workspace_id, name, current_version_id) values (${legacyProjectId}, ${workspaceId}, 'Projet E2E legacy', ${legacyVersionId})`;
    await tx`insert into file_blobs (hash, content) values (${legacyHash}, ${legacyHtml}) on conflict (hash) do nothing`;
    await tx`insert into project_files (project_id, path, hash) values (${legacyProjectId}, 'index.html', ${legacyHash})`;
    await tx`insert into project_versions (id, project_id, created_by, summary, files_snapshot, status) values (${legacyVersionId}, ${legacyProjectId}, 'agent', 'Version legacy', ${JSON.stringify({ 'index.html': legacyHash })}, 'built')`;
  });
  await sql.end();
  const link = await supabase.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link.data.properties?.hashed_token;
  if (link.error || !tokenHash) throw link.error ?? new Error('e2e_magic_link_failed');
  const verifier = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verified = await verifier.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
  if (verified.error || !verified.data.session) throw verified.error ?? new Error('e2e_session_failed');
  writeFileSync('e2e/.state.json', JSON.stringify({ email, userId, workspaceId, projectId, legacyProjectId, session: verified.data.session }));
  // Relais pour playwright.config.ts : l'utilisateur de test est administrateur pendant la suite.
  writeFileSync('e2e/.admin-email', email);
}
