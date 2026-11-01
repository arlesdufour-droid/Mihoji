import { createHash } from 'node:crypto';
import postgres from 'postgres';
import { contrastIssues, fixContrast } from '../src/lib/engine/contrast';
import { repairMalformedTags } from '../src/lib/engine/html-analysis';
import { loadEnv } from './e2e-guard';

// Répare un projet existant : balises fermantes tronquées (« </h2<p ») et textes illisibles (contraste WCAG AA).
// Crée une nouvelle version, sans toucher aux anciennes. Usage : npx tsx scripts/repair-project.ts <projectId>

async function main() {
  const projectId = process.argv[2];
  if (!projectId) throw new Error('Usage : npx tsx scripts/repair-project.ts <projectId>');
  loadEnv();
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    await sql.begin(async (tx) => {
      const [project] = await tx<{ current_version_id: string | null }[]>`select current_version_id from projects where id = ${projectId}`;
      if (!project) throw new Error(`Projet introuvable : ${projectId}`);
      const files = await tx<{ path: string; content: string }[]>`select f.path, b.content from project_files f join file_blobs b on b.hash = f.hash where f.project_id = ${projectId}`;
      const manifest: Record<string, string> = {};
      const repaired: string[] = [];
      for (const file of files) {
        let content = file.content;
        if (file.path.endsWith('.html')) {
          const mended = repairMalformedTags(content);
          content = fixContrast(mended, contrastIssues(mended)).html;
        }
        const hash = createHash('sha256').update(content).digest('hex');
        manifest[file.path] = hash;
        if (content === file.content) continue;
        await tx`insert into file_blobs (hash, content) values (${hash}, ${content}) on conflict (hash) do nothing`;
        await tx`update project_files set hash = ${hash}, updated_at = now() where project_id = ${projectId} and path = ${file.path}`;
        repaired.push(file.path);
      }
      if (repaired.length === 0) {
        console.log('Rien à réparer.');
        return;
      }
      const [version] = await tx<{ id: string }[]>`insert into project_versions (project_id, parent_version_id, created_by, summary, files_snapshot, status) values (${projectId}, ${project.current_version_id}, 'agent', 'Réparation automatique : balises cassées et textes illisibles', ${JSON.stringify(manifest)}, 'built') returning id`;
      await tx`update projects set current_version_id = ${version.id} where id = ${projectId}`;
      console.log(`Réparé : ${repaired.join(', ')} (version ${version.id}).`);
    });
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
