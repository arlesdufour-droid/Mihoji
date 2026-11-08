import { capabilityLabels, connectedCapabilities, connectors, type Capability } from './registry';

// Ce que l'IA du Studio sait des connexions du commerçant (logique pure, testée).

// Bloc ajouté à la demande envoyée au modèle de modification : connecteurs branchés (capacités utilisables) et à proposer.
export function connectorsContext(connectedIds: string[]): string {
  const usable = connectedCapabilities(connectedIds);
  const connected = connectors.filter((connector) => connectedIds.includes(connector.id));
  const missing = connectors.filter((connector) => connector.status === 'available' && !connectedIds.includes(connector.id));
  return [
    'Connexions du commerçant (ne promets jamais une fonction dont la capacité n’est pas branchée) :',
    connected.length ? `- Branchés : ${connected.map((connector) => `${connector.label} (${connector.capabilities.join(', ')})`).join(' ; ')}` : '- Aucun outil branché.',
    `- Capacités utilisables : ${usable.length ? usable.join(', ') : 'aucune'}`,
    ...(missing.length ? [`- Disponibles à brancher dans l’onglet « Connexions » : ${missing.map((connector) => connector.label).join(', ')}`] : []),
  ].join('\n');
}

const NEEDS: { pattern: RegExp; capability: Capability }[] = [
  { pattern: /acompte|paiement|payer|r[èe]glement|encaisser/i, capability: 'payments.deposit' },
  { pattern: /boutique|commande en ligne|vendre en ligne|click ?& ?collect/i, capability: 'payments.checkout' },
  { pattern: /newsletter|liste de contacts|inscription/i, capability: 'email.newsletter' },
];

// Connecteurs à proposer pour une demande : ceux qui portent une capacité demandée et qui ne sont pas encore branchés.
export function missingConnectorsFor(request: string, connectedIds: string[]): { id: string; label: string; capability: Capability }[] {
  const usable = connectedCapabilities(connectedIds);
  const found = new Map<string, { id: string; label: string; capability: Capability }>();
  for (const need of NEEDS) {
    if (!need.pattern.test(request) || usable.includes(need.capability)) continue;
    const connector = connectors.find((candidate) => candidate.capabilities.includes(need.capability));
    if (connector) found.set(connector.id, { id: connector.id, label: connector.label, capability: need.capability });
  }
  return [...found.values()];
}

// Phrase ajoutée à la réponse du chat quand la demande suppose un outil non branché.
export function connectorHintMessage(request: string, connectedIds: string[]): string | null {
  const missing = missingConnectorsFor(request, connectedIds);
  if (!missing.length) return null;
  const parts = missing.map((item) => {
    const connector = connectors.find((candidate) => candidate.id === item.id)!;
    const action = capabilityLabels[item.capability];
    return connector.status === 'available'
      ? `branchez ${item.label} dans l’onglet « Connexions » pour ${action}`
      : `${item.label} (pour ${action}) sera bientôt disponible dans l’onglet « Connexions »`;
  });
  return `Pour que cela fonctionne vraiment, ${parts.join(', et ')}.`;
}
