import postgres from 'postgres';
import { assertE2eEnvironment, loadEnv } from './e2e-guard';

// Surveillance du stockage Supabase (offre gratuite : 500 Mo de base de données). Alerte à 60 % et à 80 %.
// Lancer : npm run storage:report
const LIMIT_BYTES = 500 * 1024 * 1024;

async function main() {
  loadEnv();
  assertE2eEnvironment(); // lecture seule, mais on reste sur la base de développement
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    const [db] = await sql<{ bytes: string }[]>`select pg_database_size(current_database())::text as bytes`;
    const used = Number(db.bytes);
    const [hosted] = await sql<{ n: number; bytes: string }[]>`select count(*)::int as n, coalesce(sum(length(data)), 0)::text as bytes from hosted_photos`;
    const [mine] = await sql<{ n: number; bytes: string }[]>`select count(*)::int as n, coalesce(sum(length(data)), 0)::text as bytes from site_photos`;
    const mo = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
    const percent = (used / LIMIT_BYTES) * 100;
    console.log(`Base : ${mo(used)} sur 500 Mo (${percent.toFixed(1)} %)`);
    console.log(`Photos hébergées (Pixabay) : ${hosted.n} photos, ${mo(Number(hosted.bytes))} · photos des utilisateurs : ${mine.n}, ${mo(Number(mine.bytes))}`);
    if (percent >= 80) console.warn('ALERTE : plus de 80 % du stockage gratuit utilisé. Purger les photos hébergées inutilisées ou passer à une offre supérieure.');
    else if (percent >= 60) console.warn('Attention : plus de 60 % du stockage gratuit utilisé.');
  } finally {
    await sql.end();
  }
}

void main();
