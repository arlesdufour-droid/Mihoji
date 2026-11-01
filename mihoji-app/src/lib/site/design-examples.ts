type Company = { name: string; activity: string; address: string; phone: string; email: string };
export type DesignExample = { id: string; label: string; request: string; trade: string; company: Company };

// Demandes d'exemple : boutons du laboratoire /admin/design/generate et script de génération réelle.
export const designExamples: DesignExample[] = [
  {
    id: 'boulangerie',
    label: 'Boulangerie (click & collect)',
    request: 'Je veux un site pour ma boulangerie artisanale : pain au levain, viennoiseries et gâteaux sur commande. Mes clients doivent pouvoir commander en ligne et retirer en boutique (click & collect).',
    trade: 'Boulanger-pâtissier',
    company: { name: 'Boulangerie Brion', activity: 'Boulangerie et boulangerie-pâtisserie', address: '8 place du Marché, 17000 La Rochelle', phone: '05 46 00 12 34', email: 'contact@boulangerie-brion.fr' },
  },
  {
    id: 'coach',
    label: 'Coach sportif (rendez-vous et paiement)',
    request: 'Je suis coach sportif à domicile et en extérieur. Je veux que mes clients puissent réserver une séance en ligne et payer en ligne, à la séance ou par forfait de 10 séances.',
    trade: 'Coach sportif',
    company: { name: 'Julien Morel Coaching', activity: 'Enseignement de disciplines sportives et d’activités de loisirs', address: '24 rue Sainte-Catherine, 33000 Bordeaux', phone: '06 12 34 56 78', email: 'julien@morel-coaching.fr' },
  },
  {
    id: 'plombier',
    label: 'Plombier (demande de devis)',
    request: 'Site pour mon entreprise de plomberie-chauffage : dépannage, rénovation de salle de bain, chaudières et pompes à chaleur. Je veux recevoir des demandes de devis avec photos, et un numéro pour les urgences.',
    trade: 'Plombier-chauffagiste',
    company: { name: 'Lefèvre Plomberie', activity: 'Travaux d’installation d’eau et de gaz en tous locaux', address: '5 rue de la Loire, 44000 Nantes', phone: '02 40 12 34 56', email: 'contact@lefevre-plomberie.fr' },
  },
];

