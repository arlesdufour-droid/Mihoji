// Connecteurs de Mihoji : Mihoji ne concurrence pas Wix ou Shopify, il connecte. Chaque connecteur déclare des CAPACITÉS que l'IA du Studio
// peut utiliser ; le commerçant branche ses outils dans l'onglet « Connexions », avec des droits minimaux, et peut se déconnecter à tout moment.

export const capabilityLabels = {
  'payments.deposit': 'encaisser un acompte à la réservation',
  'payments.checkout': 'encaisser le paiement d’une commande en ligne',
  'payments.refund': 'rembourser un paiement',
  'calendar.availability': 'lire vos disponibilités',
  'calendar.book': 'créer les rendez-vous dans votre agenda',
  'catalog.read': 'afficher vos produits existants',
  'catalog.checkout': 'vendre vos produits existants',
  'email.notify': 'vous envoyer par email les demandes reçues',
  'email.newsletter': 'inscrire vos visiteurs à votre liste de contacts',
  'reviews.read': 'afficher vos avis Google',
} as const;
export type Capability = keyof typeof capabilityLabels;

export type ConnectorStatus = 'available' | 'soon';
export type ConnectorAuth = 'api_key' | 'stripe_connect' | 'oauth';

export type ConnectorDefinition = {
  id: 'stripe' | 'brevo' | 'google-calendar' | 'calendly' | 'shop-sync' | 'google-business';
  label: string;
  description: string;
  auth: ConnectorAuth;
  // Étape ou lot de livraison : tant que le connecteur n'est pas « available », l'écran l'affiche désactivé (« Bientôt disponible »).
  status: ConnectorStatus;
  capabilities: Capability[];
  // Droits demandés : toujours le minimum nécessaire, détaillés au commerçant avant la connexion.
  rights: string;
  // Champ demandé pour les connecteurs à clé d'API.
  credentialLabel?: string;
};

export const connectors: ConnectorDefinition[] = [
  { id: 'brevo', label: 'Brevo', description: 'Vos emails : notifications des demandes reçues et liste de contacts.', auth: 'api_key', status: 'available', capabilities: ['email.notify', 'email.newsletter'], rights: 'Envoi d’emails transactionnels et ajout de contacts. Mihoji ne lit jamais vos autres données.', credentialLabel: 'Clé d’API Brevo' },
  { id: 'stripe', label: 'Stripe', description: 'Paiements en ligne : l’argent est versé directement sur votre compte Stripe.', auth: 'stripe_connect', status: 'available', capabilities: ['payments.deposit', 'payments.checkout', 'payments.refund'], rights: 'Créer des paiements sur votre compte connecté et les rembourser. Mihoji ne touche jamais l’argent.' },
  { id: 'google-calendar', label: 'Google Agenda', description: 'Vos rendez-vous dans votre agenda, avec vos disponibilités réelles.', auth: 'oauth', status: 'soon', capabilities: ['calendar.availability', 'calendar.book'], rights: 'Lecture des créneaux occupés et création de rendez-vous, sur l’agenda choisi seulement.' },
  { id: 'calendly', label: 'Calendly', description: 'Votre page de réservation Calendly intégrée au site.', auth: 'oauth', status: 'soon', capabilities: ['calendar.availability', 'calendar.book'], rights: 'Lecture de vos types d’événements.' },
  { id: 'shop-sync', label: 'Shopify / WooCommerce', description: 'Affichez et vendez les produits de votre boutique existante.', auth: 'api_key', status: 'soon', capabilities: ['catalog.read', 'catalog.checkout'], rights: 'Lecture du catalogue et création de commandes.' },
  { id: 'google-business', label: 'Fiche Google', description: 'Vos avis et vos informations Google sur votre site.', auth: 'oauth', status: 'soon', capabilities: ['reviews.read'], rights: 'Lecture des avis et des informations de la fiche.' },
];

export const connectorById = (id: string): ConnectorDefinition | undefined => connectors.find((connector) => connector.id === id);

// Capacités disponibles pour l'IA : celles des connecteurs branchés.
export function connectedCapabilities(connectedIds: string[]): Capability[] {
  return [...new Set(connectors.filter((connector) => connectedIds.includes(connector.id)).flatMap((connector) => connector.capabilities))];
}
