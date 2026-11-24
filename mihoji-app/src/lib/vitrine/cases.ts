import type { BenchmarkProfile } from '../site/benchmark-cases';

// Vitrine de la page d'accueil : 8 sites d'exemple pour des entreprises FICTIVES de familles différentes, chacun avec un module transactionnel adapté.
// Les coordonnées sont fictives et sûres (numéros réservés à la fiction par l'ARCEP, domaine « .example »). Aucune ancienneté, aucun avis, aucun chiffre ni
// certification n'est fourni : la règle des vraies données s'applique (le modèle n'invente rien ; ce que le « client » fournit est dans `profile`).
export const VITRINE_NOTICE = 'Entreprise fictive — site d’exemple créé avec Mihoji';

export type VitrineModule = 'quote' | 'booking-deposit' | 'booking' | 'shop';
export type VitrineCase = {
  slug: string;
  label: string;
  family: string;
  module: VitrineModule;
  request: string;
  trade: string;
  company: { name: string; activity: string; address: string; phone: string; email: string };
  profile: BenchmarkProfile;
};

export const vitrineCases: VitrineCase[] = [
  {
    slug: 'plombier', label: 'Plombier-chauffagiste', family: 'artisan', module: 'quote',
    request: 'Site pour mon entreprise de plomberie-chauffage : dépannage, rénovation de salle de bain, remplacement de chaudière. Je veux recevoir des demandes de devis en ligne, avec des photos du problème.',
    trade: 'Plombier-chauffagiste',
    company: { name: 'Dubois Plomberie Chauffage', activity: 'Travaux d’installation d’eau et de gaz en tous locaux', address: '12 rue des Tilleuls, 49000 Angers', phone: '01 99 00 41 27', email: 'contact@dubois-plomberie.example' },
    profile: { specialties: 'dépannage fuite et chauffage, remplacement de chaudière, rénovation de salle de bain', priceRange: 'diagnostic dès 89 €, dépannage de 80 à 150 €', hours: 'Lundi au vendredi, 8 h à 18 h ; urgences 7 jours sur 7', area: 'Angers et 25 km autour', tone: 'Professionnel et rassurant' },
  },
  {
    slug: 'boulangerie', label: 'Boulangerie (click & collect)', family: 'commerce', module: 'shop',
    request: 'Je tiens une boulangerie artisanale : pain au levain, viennoiseries, gâteaux sur commande. Mes clients doivent pouvoir commander en ligne et retirer leur commande en boutique.',
    trade: 'Boulanger-pâtissier',
    company: { name: 'Maison Lemoine, boulangerie', activity: 'Boulangerie et boulangerie-pâtisserie', address: '8 place du Marché, 21000 Dijon', phone: '03 53 01 22 64', email: 'contact@maison-lemoine.example' },
    profile: { specialties: 'pain au levain, viennoiseries pur beurre, gâteaux sur commande', priceRange: 'baguette 1,20 €, croissant 1,40 €, gâteaux dès 22 €', hours: 'Mardi au samedi, 6 h 30 à 19 h ; dimanche 7 h à 13 h', area: 'Dijon (retrait en boutique)', tone: 'Chaleureux et familial' },
  },
  {
    slug: 'restaurant', label: 'Restaurant (réservation avec acompte)', family: 'restauration', module: 'booking-deposit',
    request: 'Je tiens un restaurant de cuisine de marché avec une carte courte qui change chaque semaine. Je veux présenter la carte et que mes clients puissent réserver une table en ligne, avec un acompte pour les groupes.',
    trade: 'Restaurateur',
    company: { name: 'Le Comptoir des Halles', activity: 'Restauration traditionnelle', address: '14 rue Mercière, 69002 Lyon', phone: '04 65 71 38 52', email: 'contact@comptoir-des-halles.example' },
    profile: { specialties: 'cuisine de marché, carte courte renouvelée chaque semaine, vins naturels', priceRange: 'menu du midi 24 €, plats de 18 à 32 €', hours: 'Mardi au samedi, midi et soir ; fermé dimanche et lundi', area: 'Presqu’île de Lyon', tone: 'Simple et direct' },
  },
  {
    slug: 'kinesitherapeute', label: 'Kinésithérapeute (rendez-vous)', family: 'sante', module: 'booking',
    request: 'Je suis kinésithérapeute, spécialisée en rééducation sportive et en douleurs de dos. Je veux que mes patients puissent prendre rendez-vous en ligne et trouver facilement les informations pratiques.',
    trade: 'Kinésithérapeute',
    company: { name: 'Cabinet de kinésithérapie Moreau', activity: 'Activités des professionnels de la rééducation, de l’appareillage et des pédicures-podologues', address: '3 rue de Nantes, 35000 Rennes', phone: '02 61 91 54 08', email: 'contact@kine-moreau.example' },
    profile: { specialties: 'rééducation sportive, douleurs de dos, rééducation après opération', priceRange: 'séances conventionnées, remboursées par l’Assurance maladie', hours: 'Lundi au vendredi, 8 h à 19 h ; samedi matin', area: 'Rennes et Cesson-Sévigné', tone: 'Professionnel et rassurant' },
  },
  {
    slug: 'coiffeur', label: 'Salon de coiffure (rendez-vous avec acompte)', family: 'beaute', module: 'booking-deposit',
    request: 'Je tiens un salon de coiffure mixte. Je veux que mes clients réservent leur rendez-vous en ligne et versent un petit acompte pour éviter les rendez-vous manqués.',
    trade: 'Coiffeur',
    company: { name: 'Atelier Mathilde, coiffure', activity: 'Coiffure', address: '27 rue du Port, 29200 Brest', phone: '02 61 91 77 30', email: 'contact@atelier-mathilde.example' },
    profile: { specialties: 'coupes femme et homme, couleurs, soins, coiffures de cérémonie', priceRange: 'coupe dès 25 €, couleur dès 55 €', hours: 'Mardi au samedi, 9 h à 18 h 30', area: 'Brest', tone: 'Moderne et dynamique' },
  },
  {
    slug: 'coach', label: 'Coach sportif (rendez-vous, acompte)', family: 'sport', module: 'booking-deposit',
    request: 'Je suis coach sportif à domicile et en extérieur. Je veux que mes clients puissent réserver une séance en ligne avec un acompte, et acheter un forfait de séances.',
    trade: 'Coach sportif',
    company: { name: 'Elan Coaching Sportif', activity: 'Enseignement de disciplines sportives et d’activités de loisirs', address: '24 rue Sainte-Catherine, 33000 Bordeaux', phone: '06 39 98 41 72', email: 'contact@elan-coaching.example' },
    profile: { specialties: 'coaching à domicile et en extérieur, préparation physique, remise en forme', priceRange: 'séance de 60 à 70 €, forfait de 10 séances à 580 €', hours: 'Lundi au samedi, 7 h à 20 h', area: 'Bordeaux Métropole', tone: 'Moderne et dynamique' },
  },
  {
    slug: 'photographe', label: 'Photographe (demande de devis)', family: 'creatif', module: 'quote',
    request: 'Je suis photographe de mariage et de portrait. Je veux un site qui met mes photos en valeur, présente mes forfaits et permet de demander un devis pour une date.',
    trade: 'Photographe',
    company: { name: 'Studio Claire Fontaine', activity: 'Activités photographiques', address: '6 quai de l’Île, 74000 Annecy', phone: '04 65 71 90 15', email: 'contact@claire-fontaine.example' },
    profile: { specialties: 'mariage, portrait, photo de famille', priceRange: 'forfaits mariage de 1 800 à 3 200 €, séance portrait dès 150 €', hours: 'Du lundi au samedi, sur rendez-vous', area: 'Annecy et Haute-Savoie', tone: 'Haut de gamme et élégant' },
  },
  {
    slug: 'electricien', label: 'Électricien (diagnostic avec acompte)', family: 'artisan', module: 'booking-deposit',
    request: 'Je suis électricien : mise aux normes, tableaux électriques, dépannage. Je veux que mes clients réservent en ligne un diagnostic à domicile avec un acompte.',
    trade: 'Électricien',
    company: { name: 'Garnier Électricité', activity: 'Travaux d’installation électrique dans tous locaux', address: '19 avenue de Muret, 31300 Toulouse', phone: '05 36 49 62 18', email: 'contact@garnier-electricite.example' },
    profile: { specialties: 'mise aux normes, tableaux électriques, dépannage, borne de recharge', priceRange: 'diagnostic dès 79 €, dépannage dès 90 €', hours: 'Lundi au vendredi, 8 h à 18 h ; samedi matin sur rendez-vous', area: 'Toulouse et sa périphérie', tone: 'Simple et direct' },
  },
];
