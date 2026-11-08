import 'server-only';

import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { connections } from '@/db/schema';
import { decryptSecret, encryptSecret, loadEncryptionKey } from './crypto';
import { connectorById } from './registry';

export type ConnectionSummary = { provider: string; accountLabel: string; scopes: string[]; connectedAt: Date };

// Jamais de jeton dans ce qui sort de ce module vers le navigateur : seulement un résumé.
export async function listConnections(workspaceId: string): Promise<ConnectionSummary[]> {
  const rows = await getDb().select().from(connections).where(eq(connections.workspaceId, workspaceId));
  // Une ligne sans droit accordé est une connexion en cours (compte Stripe créé, configuration pas terminée) : pas encore « connectée ».
  return rows.filter((row) => row.scopes.length > 0).map((row) => ({ provider: row.provider, accountLabel: row.accountLabel, scopes: row.scopes, connectedAt: row.createdAt }));
}

export async function connectedProviders(workspaceId: string): Promise<string[]> {
  return (await listConnections(workspaceId)).map((row) => row.provider);
}

export async function saveConnection(input: { workspaceId: string; provider: string; secret: string; accountLabel: string; scopes: string[] }): Promise<void> {
  const definition = connectorById(input.provider);
  if (!definition) throw new Error('unknown_connector');
  const credentials = encryptSecret(input.secret, loadEncryptionKey());
  await getDb().insert(connections).values({ workspaceId: input.workspaceId, provider: definition.id, accountLabel: input.accountLabel, credentials, scopes: input.scopes })
    .onConflictDoUpdate({ target: [connections.workspaceId, connections.provider], set: { accountLabel: input.accountLabel, credentials, scopes: input.scopes, updatedAt: new Date() } });
}

export async function removeConnection(workspaceId: string, provider: string): Promise<boolean> {
  const removed = await getDb().delete(connections).where(and(eq(connections.workspaceId, workspaceId), eq(connections.provider, provider as never))).returning({ id: connections.id });
  return removed.length > 0;
}

// Connexion en cours : le compte est créé chez le fournisseur mais pas encore prêt ; il reste lié à cet espace (aucun identifiant dans l'adresse de retour).
export async function savePendingConnection(workspaceId: string, provider: string, secret: string): Promise<void> {
  await saveConnection({ workspaceId, provider, secret, accountLabel: 'Configuration en cours', scopes: [] });
}

// Pour le code serveur qui appelle le service du commerçant (jamais exposé à une route publique).
export async function readSecret(workspaceId: string, provider: string): Promise<string | null> {
  const [row] = await getDb().select({ credentials: connections.credentials }).from(connections).where(and(eq(connections.workspaceId, workspaceId), eq(connections.provider, provider as never))).limit(1);
  return row ? decryptSecret(row.credentials, loadEncryptionKey()) : null;
}
