import { createHash, randomUUID } from 'node:crypto';
import http from 'node:http';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { assertE2eEnvironment, E2E_EMAIL_DOMAIN, E2E_EMAIL_PREFIX, loadEnv } from './e2e-guard';

// Test de fumée de la génération réelle avec la vraie clé Groq, contre le serveur de dev local.
// Usage : `npm run dev` dans un terminal, puis `npx tsx scripts/smoke-ai-real.ts`.
// Crée un utilisateur e2e+…@mihoji.test temporaire, supprimé à la fin.

const PROMPT = 'Ajoute une section Témoignages avec 2 avis clients';
const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';

async function main() {
loadEnv();
assertE2eEnvironment();
if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY requise pour ce test de fumée.');

const email = `${E2E_EMAIL_PREFIX}smoke-${Date.now()}@${E2E_EMAIL_DOMAIN}`;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const created = await supabase.auth.admin.createUser({ email, email_confirm: true });
if (created.error || !created.data.user) throw created.error ?? new Error('smoke_user_creation_failed');
const userId = created.data.user.id;
const workspaceId = randomUUID();
const projectId = randomUUID();
const versionId = randomUUID();

const files: Record<string, string> = {
  'index.html': '<main><h1>{{company.name}}</h1><section class="about"><h2>À propos</h2><p>Votre boulangerie à La Rochelle, pain au levain et viennoiseries.</p></section><section class="contact"><h2>Contact</h2><p>{{company.email}} — {{company.phone}}</p><p>{{company.address}}</p></section></main>',
  'styles.css': 'body { font-family: sans-serif; margin: 0; } .about { padding: 2rem; } .contact { background: #f5f5f5; padding: 2rem; }',
  'mentions-legales.html': '<main><h1>Mentions légales</h1><p>{{company.legalForm}} — {{company.address}}</p></main>',
};

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

function post(pathname: string, body: unknown, cookie: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; text: string }> {
  const url = new URL(BASE_URL);
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const request = http.request(
      { hostname: url.hostname, port: url.port, path: pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), Cookie: cookie } },
      (response) => {
        let text = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { text += chunk; });
        response.on('end', () => resolve({ status: response.statusCode ?? 0, headers: response.headers, text }));
      },
    );
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

try {
  await sql.begin(async (tx) => {
    await tx`insert into users (id, email) values (${userId}, ${email})`;
    await tx`insert into workspaces (id, name, owner_id) values (${workspaceId}, 'Espace fumée IA', ${userId})`;
    await tx`insert into workspace_members (workspace_id, user_id, role) values (${workspaceId}, ${userId}, 'owner')`;
    await tx`insert into subscriptions (workspace_id, plan_id, credits_remaining, credits_used, monthly_allowance, period_end) values (${workspaceId}, 'free', 100000, 0, 100000, now() + interval '30 days')`;
    await tx`insert into projects (id, workspace_id, name, current_version_id) values (${projectId}, ${workspaceId}, 'Projet fumée', ${versionId})`;
    const snapshot: Record<string, string> = {};
    for (const [path, content] of Object.entries(files)) {
      const hash = createHash('sha256').update(content).digest('hex');
      snapshot[path] = hash;
      await tx`insert into file_blobs (hash, content) values (${hash}, ${content}) on conflict (hash) do nothing`;
      await tx`insert into project_files (project_id, path, hash) values (${projectId}, ${path}, ${hash})`;
    }
    await tx`insert into project_versions (id, project_id, created_by, summary, files_snapshot, status) values (${versionId}, ${projectId}, 'agent', 'Version initiale', ${JSON.stringify(snapshot)}, 'built')`;
  });

  const link = await supabase.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link.data.properties?.hashed_token;
  if (link.error || !tokenHash) throw link.error ?? new Error('smoke_magic_link_failed');
  const verifier = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const verified = await verifier.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
  if (verified.error || !verified.data.session) throw verified.error ?? new Error('smoke_session_failed');

  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0];
  const value = `base64-${Buffer.from(JSON.stringify(verified.data.session)).toString('base64url')}`;
  const name = `sb-${ref}-auth-token`;
  const chunks: string[] = [];
  for (let i = 0; i * 3180 < value.length; i += 1) chunks.push(`${chunks.length === 0 && value.length <= 3180 ? name : `${name}.${chunks.length}`}=${value.slice(i * 3180, (i + 1) * 3180)}`);

  const startedAt = Date.now();
  const response = await post('/api/generate', { projectId, task: 'chat', messages: [{ role: 'user', content: PROMPT }] }, chunks.join('; '));
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`HTTP ${response.status} en ${elapsed} s`);
  console.log('En-têtes : changed =', response.headers['x-mihoji-changed'], '| files =', response.headers['x-mihoji-files'], '| mock =', response.headers['x-mihoji-mock'] ?? 'non');
  console.log('Réponse :', response.text);
  if (response.headers['x-mihoji-mock'] === '1') throw new Error('Réponse simulée : la vraie clé Groq n’a pas été utilisée.');
  if (response.status !== 200) throw new Error(`Appel échoué : HTTP ${response.status}`);

  const [ledger] = await sql<{ amount: number }[]>`select amount from credit_ledger where workspace_id = ${workspaceId} order by created_at desc limit 1`;
  console.log('Tokens consommés (grand livre) :', ledger?.amount ?? 'aucun');

  const [updated] = await sql<{ content: string }[]>`select b.content from project_files f join file_blobs b on b.hash = f.hash where f.project_id = ${projectId} and f.path = 'index.html'`;
  const ok = !!updated && /témoignage/i.test(updated.content) && updated.content.includes('{{company.name}}');
  console.log(ok ? 'SUCCÈS : la section Témoignages est présente et le contenu existant est conservé.' : 'ÉCHEC : section absente ou contenu existant perdu.');
  if (!ok) process.exitCode = 1;
} finally {
  await sql`delete from project_files where project_id = ${projectId}`;
  await sql`delete from project_versions where project_id = ${projectId}`;
  await sql`delete from projects where id = ${projectId}`;
  await sql`delete from credit_ledger where workspace_id = ${workspaceId}`;
  await sql`delete from subscriptions where workspace_id = ${workspaceId}`;
  await sql`delete from workspace_members where workspace_id = ${workspaceId}`;
  await sql`delete from workspaces where id = ${workspaceId}`;
  await sql`delete from users where id = ${userId}`;
  await sql.end();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error && !/not found/i.test(error.message)) console.error('Suppression du compte auth impossible.', error);
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
