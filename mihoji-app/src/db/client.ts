import 'server-only';

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/db/schema';

let client: ReturnType<typeof postgres> | undefined;

export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error('database_not_configured');
  client ??= postgres(process.env.DATABASE_URL, { prepare: false });
  return drizzle(client, { schema });
}
