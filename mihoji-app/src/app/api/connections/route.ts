import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectors } from '@/lib/connectors/registry';
import { listConnections } from '@/lib/connectors/store';

// Liste des connecteurs et de leur état pour l'espace connecté. Aucun jeton n'est jamais renvoyé.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const connected = session.isDemo ? [] : await listConnections(session.workspaceId);
  return NextResponse.json(connectors.map((connector) => {
    const link = connected.find((entry) => entry.provider === connector.id);
    return { id: connector.id, label: connector.label, description: connector.description, auth: connector.auth, status: connector.status, rights: connector.rights, credentialLabel: connector.credentialLabel ?? null, capabilities: connector.capabilities, connected: Boolean(link), accountLabel: link?.accountLabel ?? null };
  }));
}
