import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';

function loadLocalEnvironment() {
  try {
    const contents = readFileSync('.env.local', 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch {
    // The shell environment may already provide all required variables.
  }
}

async function main() {
  loadLocalEnvironment();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required to run migrations');

  const sql = postgres(databaseUrl, { prepare: false });
  try {
    await sql`CREATE TABLE IF NOT EXISTS "_mihoji_migrations" ("filename" text PRIMARY KEY, "applied_at" timestamptz NOT NULL DEFAULT now())`;
    const [schemaState] = await sql<{ users: string | null; projects: string | null; companies: string | null }[]>`
      SELECT to_regclass('public.users')::text AS users,
        to_regclass('public.projects')::text AS projects,
        to_regclass('public.companies')::text AS companies
    `;
    const appliedBeforeBaseline = await sql<{ filename: string }[]>`SELECT filename FROM "_mihoji_migrations"`;
    if (schemaState?.users && schemaState.projects && schemaState.companies) {
      const historicalFiles = filesBeforeCurrentSchema();
      const missingHistoricalFiles = historicalFiles.filter((filename) => !appliedBeforeBaseline.some((row) => row.filename === filename));
      if (missingHistoricalFiles.length) {
        await sql`INSERT INTO "_mihoji_migrations" ${sql(missingHistoricalFiles.map((filename) => ({ filename })))} ON CONFLICT DO NOTHING`;
        console.log(`Baselined ${missingHistoricalFiles.length} existing migrations`);
      }
    }
    const applied = await sql<{ filename: string }[]>`SELECT filename FROM "_mihoji_migrations"`;
    const appliedNames = new Set(applied.map(({ filename }) => filename));
    const directory = join(process.cwd(), 'db', 'migrations');
    const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
    for (const filename of files) {
      if (appliedNames.has(filename)) continue;
      await sql.begin(async (transaction) => {
        const contents = await readFile(join(directory, filename), 'utf8');
        await transaction.unsafe(contents);
        await transaction`INSERT INTO "_mihoji_migrations" ("filename") VALUES (${filename})`;
      });
      console.log(`Applied ${filename}`);
    }

    function filesBeforeCurrentSchema() {
      return [
        '0000_phase_2_lot_0.sql',
        '0001_phase_2_lot_2a.sql',
        '0002_phase_2_lot_3.sql',
        '0003_phase_3_lot_1.sql',
        '0004_phase_3c_lot_2.sql',
        '0005_phase_3c_lot_6.sql',
        '0006_phase_3b_lot_a.sql',
        '0007_phase_3b_lot_b.sql',
      ];
    }
  } finally {
    await sql.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
