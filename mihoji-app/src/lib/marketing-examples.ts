import type { CompanyLookup } from '@/lib/company/lookup';

export type Example = { slug: string; label: string; emoji: string; description: string; company: CompanyLookup };

function company(name: string, activity: string, address: string): CompanyLookup {
  return { siret: '00000000000000', siren: '000000000', name, legalForm: 'EI', address, activity, createdAt: '2020-01-01', vatNumber: '', status: 'active' };
}

// Entreprises fictives servant de modèles sur la page d'accueil.
export const examples: Example[] = [
  { slug: 'plombier', label: 'Plombier', emoji: '🔧', description: 'Dépannage, installation, devis gratuit.', company: company('Dupont Plomberie', 'Plomberie et chauffage', '12 rue des Artisans, 44000 Nantes') },
  { slug: 'boulangerie', label: 'Boulangerie', emoji: '🥖', description: 'Pains, viennoiseries et horaires d’ouverture.', company: company('Boulangerie Martin', 'Boulangerie et boulangerie-pâtisserie', '3 place du Marché, 17000 La Rochelle') },
  { slug: 'kine', label: 'Kinésithérapeute', emoji: '🩺', description: 'Prise de rendez-vous et présentation du cabinet.', company: company('Cabinet de kinésithérapie Leroy', 'Kinésithérapie', '8 avenue de la Gare, 69003 Lyon') },
  { slug: 'consultant', label: 'Consultant', emoji: '💼', description: 'Offres, références et contact.', company: company('Claire Bernard Conseil', 'Conseil pour les affaires et autres conseils de gestion', '25 boulevard Haussmann, 75009 Paris') },
];

export function exampleBySlug(slug: string): Example | undefined {
  return examples.find((example) => example.slug === slug);
}
