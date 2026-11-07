import { designExamples } from './design-examples';

// Banc d'essai de qualité (phase Q, lot 6) : 12 demandes FIGÉES, identiques d'une exécution à l'autre, pour comparer avant/après.
// Toute modification d'un cas (demande, entreprise) ou l'ajout/retrait d'un cas incrémente BENCHMARK_VERSION :
// les résultats de deux versions différentes ne se comparent pas.
// Les entreprises sont fictives, mais leurs coordonnées ont des formats réalistes (indicatif régional cohérent avec la ville,
// numéros non séquentiels) pour que le juge ne pénalise pas des artefacts du banc (v2 : numéros réalistes ; les notes v1 ne sont plus comparables).
export const BENCHMARK_VERSION = 2;

export type BenchmarkCompany = { name: string; activity: string; address: string; phone: string; email: string };
export type BenchmarkCase = { id: string; label: string; request: string; company: BenchmarkCompany; poorData?: 'naf-brut' | 'demande-courte' };

const example = (id: string) => {
  const found = designExamples.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`exemple_introuvable:${id}`);
  return { id: found.id, label: found.label, request: found.request, company: found.company };
};

export const benchmarkCases: BenchmarkCase[] = [
  example('plombier'),
  example('boulangerie'),
  {
    id: 'restaurant',
    label: 'Restaurant (réservation de table)',
    request: 'Je tiens un restaurant de cuisine de marché, avec une carte courte qui change chaque semaine. Je veux présenter la carte et mes horaires, et que mes clients puissent réserver une table en ligne.',
    company: { name: 'Le Comptoir des Halles', activity: 'Restauration traditionnelle', address: '14 rue Mercière, 69002 Lyon', phone: '04 78 37 42 19', email: 'contact@comptoir-des-halles.fr' },
  },
  {
    id: 'kine',
    label: 'Kinésithérapeute (rendez-vous)',
    request: 'Je suis kinésithérapeute, spécialisée en rééducation sportive et en douleurs de dos. Je veux que mes patients puissent prendre rendez-vous en ligne et trouver facilement les informations pratiques et les remboursements.',
    company: { name: 'Cabinet de kinésithérapie Moreau', activity: 'Activités des professionnels de la rééducation et de l’appareillage', address: '3 rue de Nantes, 35000 Rennes', phone: '02 99 38 61 54', email: 'contact@kine-moreau.fr' },
  },
  example('coach'),
  {
    id: 'avocat',
    label: 'Avocat (site sobre, droit de la famille)',
    request: 'Je suis avocat en droit de la famille (divorce, garde d’enfants, succession). Je veux un site sobre et rassurant qui présente mes domaines d’intervention, le déroulé d’un premier rendez-vous et comment me contacter. Aucune promesse de résultat.',
    company: { name: 'Cabinet Delaunay Avocats', activity: 'Activités juridiques', address: '21 rue Nationale, 59800 Lille', phone: '03 20 55 18 73', email: 'contact@delaunay-avocats.fr' },
  },
  {
    id: 'fleuriste',
    label: 'Fleuriste (commande et retrait)',
    request: 'Je suis fleuriste. Je veux montrer mes bouquets de saison, proposer un abonnement floral et permettre de commander en ligne pour un retrait en boutique ou une livraison locale.',
    company: { name: 'Atelier Floral Lemaire', activity: 'Commerce de détail de fleurs', address: '9 rue des Hallebardes, 67000 Strasbourg', phone: '03 88 32 76 41', email: 'contact@atelier-lemaire.fr' },
  },
  {
    id: 'garage',
    label: 'Garage automobile (devis)',
    request: 'Nous sommes un garage indépendant : entretien, freins, pneus, climatisation et préparation au contrôle technique. Je veux que les clients puissent demander un devis en ligne et voir nos horaires d’ouverture.',
    company: { name: 'Garage Bernard Automobiles', activity: 'Entretien et réparation de véhicules automobiles légers', address: '32 avenue de Muret, 31300 Toulouse', phone: '05 61 73 29 84', email: 'contact@garage-bernard.fr' },
  },
  {
    id: 'photographe',
    label: 'Photographe de mariage (portfolio)',
    request: 'Je suis photographe de mariage et de portrait. Je veux un site qui met mes photos en valeur, présente mes forfaits et permet de me demander mes disponibilités pour une date.',
    company: { name: 'Studio Claire Fontaine', activity: 'Activités photographiques', address: '6 quai de l’Île, 74000 Annecy', phone: '04 50 45 67 12', email: 'contact@claire-fontaine-photo.fr' },
  },
  {
    id: 'consultant',
    label: 'Consultant en organisation (B2B)',
    request: 'Je suis consultant en organisation pour les PME. Je veux présenter mes offres (diagnostic, accompagnement, formation), rassurer sur ma méthode et proposer une lettre d’information mensuelle.',
    company: { name: 'Perrin Conseil', activity: 'Conseil pour les affaires et autres conseils de gestion', address: '18 rue de Rivoli, 75004 Paris', phone: '01 42 72 38 95', email: 'contact@perrin-conseil.fr' },
  },
  {
    // Données pauvres 1 : l'activité est un code NAF brut sans libellé lisible (aucun libellé connu de lookup.ts).
    id: 'pauvre-naf',
    label: 'Données pauvres : code NAF brut',
    request: 'Je veux un site simple et accueillant pour présenter ma boutique, mes produits, mes horaires et comment venir.',
    company: { name: 'Maison Aubry', activity: '47.78C', address: '27 rue du Port, 29200 Brest', phone: '02 98 44 17 36', email: 'contact@maison-aubry.fr' },
    poorData: 'naf-brut',
  },
  {
    // Données pauvres 2 : demande d'une seule ligne, sans aucune précision.
    id: 'pauvre-demande',
    label: 'Données pauvres : demande d’une ligne',
    request: 'Je veux un site pour mon entreprise.',
    company: { name: 'Menuiserie Roux', activity: 'Travaux de menuiserie bois et PVC', address: '5 rue des Chênes, 37000 Tours', phone: '02 47 20 53 68', email: 'contact@menuiserie-roux.fr' },
    poorData: 'demande-courte',
  },
];
