import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required to run migrations');

const sql = postgres(databaseUrl, { prepare: false });
await sql`CREATE TABLE IF NOT EXISTS "_mihoji_migrations" ("filename" text PRIMARY KEY, "applied_at" timestamptz NOT NULL DEFAULT now())`;
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
await sql.end();
