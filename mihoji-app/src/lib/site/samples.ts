import photos from './sample-photos.json';
import { sectionVariants, type Section, type SectionType, type SiteDescription, type SiteInput, type StyleId } from './schema';
import { displayModules, type DisplayModule, type SiteModules } from './modules';

export type SampleCompany = { name: string; activity: string; address: string; legalForm: string; email: string; phone: string };

export type Sample = { id: string; style: StyleId; palette?: string; label: string; company: SampleCompany; site: SiteInput };

const alt = (text: string) => ({ alt: text });

export const samples: Sample[] = [
  {
    id: 'boulangerie',
    style: 'artisan',
    label: 'Boulangerie',
    company: { name: 'Boulangerie Martin', activity: 'Boulangerie et boulangerie-pâtisserie', address: '3 place du Marché, 17000 La Rochelle', legalForm: 'SARL', email: 'bonjour@boulangerie-martin.fr', phone: '05 46 00 12 34' },
    site: {
      version: 1,
      theme: { style: 'artisan', palette: 'terracotta' },
      seo: { title: 'Boulangerie Martin — pain au levain à La Rochelle', description: 'Boulangerie artisanale à La Rochelle : pains au levain, viennoiseries pur beurre et pâtisseries faites maison chaque matin.' },
      primaryCta: { label: 'Commander pour demain', href: '#contact' },
      pages: [{
        slug: 'index', title: 'Accueil',
        sections: [
          { type: 'hero', variant: 'photo', eyebrow: 'Boulanger à La Rochelle depuis 1998', title: 'Le vrai goût du pain, pétri à la main chaque nuit', subtitle: 'Farines de blé local, levain naturel et fermentation lente : nos pains sont prêts à l’ouverture, encore tièdes.', highlights: ['Cuit sur sole, toute la journée', 'Farines locales et bio'], secondaryCta: { label: 'Voir nos pains', href: '#products' }, image: { query: 'bakery bread loaves', ...alt('Pains dorés sortant du four d’une boulangerie artisanale') } },
          { type: 'about', variant: 'image-right', eyebrow: 'Notre histoire', title: 'Une maison de famille au cœur du Marché', paragraphs: ['Camille et Julien Martin ont repris la boulangerie de leurs parents en 2012. Ici, on pétrit la veille, on laisse la pâte lever douze heures et on enfourne avant l’aube.', 'Nous travaillons avec deux meuniers charentais et un apiculteur de l’île de Ré. Pas d’additifs, pas de raccourcis : juste du temps et du savoir-faire.'], highlights: ['Levain naturel entretenu depuis 25 ans', 'Beurre AOP Charentes-Poitou'], image: { query: 'baker kneading dough bakery', ...alt('Julien Martin façonnant des pains sur son plan de travail') } },
          { type: 'products', variant: 'grid', eyebrow: 'Fait maison', title: 'Nos incontournables', intro: 'Chaque matin, une trentaine de références sortent du four. Voici celles que nos clients nous réclament le plus.', items: [
            { name: 'Pain de campagne au levain', description: 'Croûte épaisse, mie alvéolée et légèrement acidulée. Se garde cinq jours.', price: '3,60 €', tag: 'Best-seller' },
            { name: 'Baguette tradition', description: 'Pétrie à la main, longue fermentation, croustillante à souhait.', price: '1,40 €' },
            { name: 'Croissant pur beurre', description: 'Feuilletage de 27 couches au beurre AOP, doré à la perfection.', price: '1,30 €', tag: 'Du jour' },
          ] },
          { type: 'testimonials', variant: 'cards', eyebrow: 'Ils nous font confiance', title: 'Ce que disent nos clients', items: [
            { quote: 'Le meilleur pain de la ville, sans hésiter. Le levain, ça se sent dès la première bouchée.', author: 'Sophie L.', role: 'Cliente depuis 8 ans', rating: 5 },
            { quote: 'Commande de viennoiseries pour trente personnes, tout était prêt et encore chaud. Un vrai professionnalisme.', author: 'Marc D.', role: 'Association sportive', rating: 5 },
            { quote: 'On vient de Rochefort le dimanche pour leur pain de campagne. Ça vaut le détour.', author: 'Nadia B.', rating: 5 },
          ] },
          { type: 'hours', variant: 'card', eyebrow: 'Passez nous voir', title: 'Horaires d’ouverture', rows: [{ day: 'Mardi – Vendredi', hours: '6h30 – 19h30' }, { day: 'Samedi', hours: '6h30 – 19h00' }, { day: 'Dimanche', hours: '7h00 – 13h00' }, { day: 'Lundi', hours: 'Fermé' }], note: 'Commandes spéciales : prévenez-nous 48 h à l’avance.' },
          { type: 'cta', variant: 'banner', title: 'Une commande pour un événement ?', text: 'Pains, viennoiseries et pièces salées pour vos réceptions : nous préparons tout sur mesure.', button: { label: 'Demander un devis', href: '#contact' } },
          { type: 'contact', variant: 'split', mode: 'contact', eyebrow: 'Contact', title: 'Une question, une commande ?', intro: 'Écrivez-nous ou passez à la boutique : nous répondons sous 24 heures.' },
          { type: 'map', variant: 'card', title: 'Nous trouver', intro: 'À deux pas du marché couvert.', access: ['Parking gratuit place du Marché', 'Bus ligne 1, arrêt Hôtel de Ville'] },
          { type: 'footer', variant: 'columns', tagline: 'Boulangerie artisanale à La Rochelle : du pain, du temps et du cœur.' },
        ],
      }],
    },
  },
  {
    id: 'kine',
    style: 'moderne',
    label: 'Kinésithérapeute',
    company: { name: 'Cabinet de kinésithérapie Leroy', activity: 'Kinésithérapie', address: '8 avenue de la Gare, 69003 Lyon', legalForm: 'SELARL', email: 'contact@kine-leroy.fr', phone: '04 72 00 45 67' },
    site: {
      version: 1,
      theme: { style: 'moderne', palette: 'bleu' },
      seo: { title: 'Cabinet de kinésithérapie Leroy — Lyon 3e', description: 'Kinésithérapeutes à Lyon 3e : rééducation, kiné du sport, rééducation périnéale. Rendez-vous rapide, prise en charge personnalisée.' },
      primaryCta: { label: 'Prendre rendez-vous', href: '#contact' },
      pages: [{
        slug: 'index', title: 'Accueil',
        sections: [
          { type: 'hero', variant: 'split', eyebrow: 'Kinésithérapie à Lyon 3e', title: 'Retrouvez votre mobilité, sans attendre', subtitle: 'Trois kinésithérapeutes vous accueillent à deux minutes de la gare Part-Dieu, avec un rendez-vous sous 48 heures.', highlights: ['Rendez-vous sous 48 h', 'Tiers payant accepté', 'Plateau technique de rééducation'], secondaryCta: { label: 'Nos spécialités', href: '#services' }, image: { query: 'physiotherapist treating patient', ...alt('Kinésithérapeute accompagnant un patient pendant un exercice de rééducation') } },
          { type: 'services', variant: 'icons', eyebrow: 'Nos spécialités', title: 'Un suivi adapté à chaque situation', intro: 'Chaque bilan est personnalisé : nous construisons avec vous un parcours de soins clair, avec des objectifs mesurables.', items: [
            { title: 'Rééducation post-opératoire', description: 'Genou, épaule, hanche : un protocole précis pour récupérer en toute sécurité après une intervention.', icon: 'stethoscope' },
            { title: 'Kinésithérapie du sport', description: 'Entorses, tendinites, reprise progressive : nous vous remettons sur le terrain, durablement.', icon: 'dumbbell' },
            { title: 'Douleurs du dos et cervicales', description: 'Techniques manuelles et exercices ciblés pour soulager les douleurs et prévenir les récidives.', icon: 'heart' },
          ] },
          { type: 'about', variant: 'image-left', eyebrow: 'Le cabinet', title: 'Une équipe à votre écoute', paragraphs: ['Fondé en 2014, le cabinet réunit trois praticiens aux compétences complémentaires. Chaque séance dure 30 minutes, en tête-à-tête, jamais en parallèle d’un autre patient.', 'Nous échangeons avec votre médecin et vos spécialistes pour assurer la continuité de vos soins.'], highlights: ['Séances individuelles de 30 minutes', 'Accès de plain-pied, cabinet accessible'], image: { query: 'physiotherapy clinic', ...alt('Salle de soins lumineuse du cabinet de kinésithérapie') } },
          { type: 'team', variant: 'cards', title: 'Les praticiens', members: [
            { name: 'Claire Leroy', role: 'Kinésithérapeute, fondatrice', bio: 'Spécialisée en rééducation post-opératoire et en rhumatologie.' },
            { name: 'Thomas Girard', role: 'Kinésithérapeute du sport', bio: 'Ancien préparateur physique, il accompagne les sportifs amateurs et licenciés.' },
            { name: 'Inès Haddad', role: 'Kinésithérapeute, périnéologie', bio: 'Diplômée en rééducation périnéale et suivi de grossesse.' },
          ] },
          { type: 'stats', variant: 'cards', items: [{ value: '10 ans', label: 'd’expérience du cabinet' }, { value: '3', label: 'praticiens diplômés d’État' }, { value: '48 h', label: 'pour un premier rendez-vous' }] },
          { type: 'faq', variant: 'accordion', eyebrow: 'Questions fréquentes', title: 'Avant votre première séance', items: [
            { question: 'Faut-il une ordonnance ?', answer: 'Pour être remboursé, oui : une prescription médicale est nécessaire. Vous pouvez venir pour un bilan, nous vous guidons ensuite.' },
            { question: 'Que dois-je apporter ?', answer: 'Votre carte Vitale, votre ordonnance, vos éventuels examens (radios, IRM) et une tenue confortable.' },
            { question: 'Les séances sont-elles remboursées ?', answer: 'Oui, à 60 % par l’Assurance Maladie, le reste est généralement pris en charge par votre mutuelle. Nous pratiquons le tiers payant.' },
          ] },
          { type: 'hours', variant: 'table', title: 'Horaires du cabinet', intro: 'Sur rendez-vous, du lundi au samedi.', rows: [{ day: 'Lundi – Jeudi', hours: '8h00 – 19h30' }, { day: 'Vendredi', hours: '8h00 – 18h00' }, { day: 'Samedi', hours: '9h00 – 12h30' }], note: 'Visites à domicile possibles sur prescription.' },
          { type: 'contact', variant: 'split', mode: 'quote', title: 'Prenez rendez-vous', intro: 'Décrivez brièvement votre besoin : nous vous rappelons sous 24 h ouvrées pour fixer un créneau.', services: ['Rééducation post-opératoire', 'Kinésithérapie du sport', 'Douleurs du dos', 'Autre demande'], submitLabel: 'Demander un rendez-vous' },
          { type: 'map', variant: 'split', title: 'Accès au cabinet', intro: 'À 2 minutes de la gare Part-Dieu.', access: ['Tramway T1, arrêt Dauphiné-Lacassagne', 'Parking public à 100 m'] },
          { type: 'footer', variant: 'simple', tagline: 'Kinésithérapie à Lyon 3e — rééducation, sport, périnéologie.' },
        ],
      }],
    },
  },
  {
    id: 'avocat',
    style: 'premium',
    label: 'Cabinet d’avocats',
    company: { name: 'Maître Claire Bernard', activity: 'Activités juridiques', address: '25 boulevard Haussmann, 75009 Paris', legalForm: 'SELARL', email: 'cabinet@bernard-avocats.fr', phone: '01 40 00 78 90' },
    site: {
      version: 1,
      theme: { style: 'premium', palette: 'marine' },
      seo: { title: 'Maître Claire Bernard — avocate en droit des affaires à Paris', description: 'Cabinet d’avocats à Paris 9e : droit des sociétés, contrats commerciaux, contentieux. Premier rendez-vous de cadrage offert.' },
      primaryCta: { label: 'Prendre rendez-vous', href: '#contact' },
      pages: [{
        slug: 'index', title: 'Accueil',
        sections: [
          { type: 'hero', variant: 'centered', eyebrow: 'Droit des affaires · Paris 9e', title: 'Sécuriser vos décisions, défendre vos intérêts', subtitle: 'Un cabinet à taille humaine qui accompagne dirigeants et entrepreneurs dans la création, le développement et la transmission de leur entreprise.', secondaryCta: { label: 'Nos domaines d’intervention', href: '#services' }, image: { query: 'law office desk', ...alt('Bureau d’avocat élégant, lumière naturelle et bibliothèque') } },
          { type: 'about', variant: 'text', eyebrow: 'Le cabinet', title: 'Une approche rigoureuse, un interlocuteur unique', paragraphs: ['Inscrite au Barreau de Paris depuis 2009, Maître Bernard conseille des dirigeants de PME et des fondateurs de start-up sur leurs enjeux juridiques les plus sensibles.', 'Chaque dossier est traité personnellement : vous n’êtes jamais confié à un collaborateur inconnu, et vous savez à tout moment où en est votre affaire.'], highlights: ['Honoraires annoncés dès le premier rendez-vous', 'Confidentialité et secret professionnel garantis'] },
          { type: 'services', variant: 'list', eyebrow: 'Domaines d’intervention', title: 'Ce que nous faisons pour vous', items: [
            { title: 'Droit des sociétés', description: 'Création, pactes d’associés, levées de fonds, cessions et transmissions d’entreprise.', price: 'Sur devis' },
            { title: 'Contrats commerciaux', description: 'Rédaction et négociation de vos conditions générales, contrats de distribution et de prestation.', price: 'Forfait' },
            { title: 'Contentieux des affaires', description: 'Litiges entre associés, impayés, rupture brutale de relations commerciales : défendre vos droits devant les juridictions.', price: 'Au temps passé' },
          ] },
          { type: 'stats', variant: 'row', items: [{ value: '15 ans', label: 'de barreau' }, { value: '400+', label: 'dossiers menés' }, { value: '92 %', label: 'de clients fidèles' }] },
          { type: 'testimonials', variant: 'quote', eyebrow: 'Témoignages', title: 'La confiance de dirigeants', items: [
            { quote: 'Claire Bernard nous a accompagnés pendant toute notre levée de fonds. Disponible, précise, et surtout très claire dans ses conseils.', author: 'Antoine R.', role: 'Fondateur, société de logiciels' },
            { quote: 'Un cabinet réactif, qui sait aller à l’essentiel.', author: 'Hélène V.', role: 'Gérante, groupe de restauration' },
          ] },
          { type: 'faq', variant: 'columns', eyebrow: 'Questions', title: 'Premiers rendez-vous', items: [
            { question: 'Combien coûte un premier rendez-vous ?', answer: 'Le rendez-vous de cadrage d’une heure est offert : nous évaluons votre situation et vous indiquons le coût prévisible.' },
            { question: 'Intervenez-vous hors de Paris ?', answer: 'Oui, partout en France, en visioconférence ou en nous déplaçant pour les dossiers qui l’exigent.' },
            { question: 'Comment sont fixés vos honoraires ?', answer: 'Au forfait quand le périmètre est défini, au temps passé sinon, toujours avec une convention d’honoraires écrite.' },
          ] },
          { type: 'cta', variant: 'minimal', title: 'Parlons de votre projet', text: 'Un premier échange pour comprendre vos enjeux, sans engagement.', button: { label: 'Prendre rendez-vous', href: '#contact' } },
          { type: 'contact', variant: 'centered', mode: 'contact', title: 'Contactez le cabinet', intro: 'Présentez-nous brièvement votre situation : nous revenons vers vous sous 24 heures ouvrées.' },
          { type: 'footer', variant: 'columns', tagline: 'Avocate au Barreau de Paris — droit des affaires.' },
        ],
      }],
    },
  },
  {
    id: 'coach',
    style: 'dynamique',
    label: 'Coach sportif',
    company: { name: 'Elan Coaching', activity: 'Activités de santé humaine', address: '14 quai des Chartrons, 33000 Bordeaux', legalForm: 'EI', email: 'salut@elan-coaching.fr', phone: '06 12 34 56 78' },
    site: {
      version: 1,
      theme: { style: 'dynamique', palette: 'violet' },
      seo: { title: 'Elan Coaching — coach sportif à Bordeaux', description: 'Coaching sportif personnalisé à Bordeaux : perte de poids, remise en forme, préparation physique. Séance d’essai offerte.' },
      primaryCta: { label: 'Réserver ma séance d’essai', href: '#contact' },
      pages: [{
        slug: 'index', title: 'Accueil',
        sections: [
          { type: 'hero', variant: 'split', eyebrow: 'Coach sportif à Bordeaux', title: 'Bougez mieux, tenez dans la durée', subtitle: 'Des séances sur mesure, en salle, en extérieur ou chez vous. Votre première séance d’essai est offerte.', highlights: ['Séance d’essai offerte', 'Programme 100 % personnalisé'], secondaryCta: { label: 'Découvrir les formules', href: '#products' }, image: { query: 'personal trainer outdoor workout', ...alt('Coach sportif encourageant une cliente pendant une séance en extérieur') } },
          { type: 'stats', variant: 'row', items: [{ value: '250+', label: 'clients accompagnés' }, { value: '9 ans', label: 'de coaching' }, { value: '4,9/5', label: 'de satisfaction' }] },
          { type: 'services', variant: 'cards', eyebrow: 'Mes programmes', title: 'Un objectif, un plan', items: [
            { title: 'Perte de poids', description: 'Un programme progressif mêlant renforcement, cardio doux et conseils d’hygiène de vie.', icon: 'sparkles' },
            { title: 'Remise en forme', description: 'Retrouvez de l’énergie et du souffle avec des séances variées, adaptées à votre niveau.', icon: 'heart' },
            { title: 'Préparation physique', description: 'Marathon, trail, saison de rugby : une préparation structurée pour atteindre votre objectif.', icon: 'dumbbell' },
          ] },
          { type: 'gallery', variant: 'masonry', eyebrow: 'En action', title: 'Les séances en images', images: [
            { image: { query: 'outdoor group fitness class', ...alt('Séance de groupe en plein air sur les quais') } },
            { image: { query: 'kettlebell training gym', ...alt('Exercice de renforcement avec kettlebell') } },
            { image: { query: 'running sunrise training', ...alt('Entraînement de course à pied au lever du soleil') } },
            { image: { query: 'stretching yoga session', ...alt('Séance d’étirements en fin d’entraînement') } },
            { image: { query: 'boxing training coach', ...alt('Travail de boxe avec gants de frappe') } },
            { image: { query: 'plank core workout', ...alt('Exercice de gainage en séance individuelle') } },
          ] },
          { type: 'products', variant: 'menu', eyebrow: 'Formules', title: 'Choisissez votre rythme', items: [
            { name: 'Séance découverte', description: 'Bilan de forme et première séance, offerts.', price: 'Offerte' },
            { name: 'Séance individuelle', description: '1 heure, en salle ou en extérieur.', price: '55 €' },
            { name: 'Pack 10 séances', description: 'Valable 4 mois, séances à planifier selon vos disponibilités.', price: '490 €' },
            { name: 'Duo ou petit groupe', description: 'Jusqu’à 4 personnes, idéal entre amis ou collègues.', price: '30 € / pers.' },
          ] },
          { type: 'testimonials', variant: 'list', eyebrow: 'Résultats', title: 'Ils ont franchi le cap', items: [
            { quote: 'En six mois, j’ai perdu 12 kilos et surtout retrouvé le plaisir de bouger. Les séances sont toujours différentes et motivantes.', author: 'Léa M.', role: 'Programme perte de poids', rating: 5 },
            { quote: 'Préparation du marathon de Bordeaux : j’ai battu mon record de 14 minutes. Merci coach !', author: 'Karim S.', role: 'Préparation physique', rating: 5 },
          ] },
          { type: 'area', variant: 'chips', eyebrow: 'Où ?', title: 'Je me déplace près de chez vous', intro: 'Séances en salle partenaire, en extérieur ou à domicile.', places: ['Bordeaux Centre', 'Chartrons', 'Bacalan', 'Caudéran', 'Talence', 'Mérignac', 'Pessac', 'Le Bouscat', 'Bègles'] },
          { type: 'cta', variant: 'card', title: 'Prêt à passer à l’action ?', text: 'Réservez votre séance d’essai offerte et repartez avec un plan clair.', button: { label: 'Réserver ma séance', href: '#contact' } },
          { type: 'contact', variant: 'centered', mode: 'quote', title: 'On commence quand ?', intro: 'Dites-moi votre objectif, je vous réponds dans la journée.', services: ['Perte de poids', 'Remise en forme', 'Préparation physique'], submitLabel: 'Réserver ma séance' },
          { type: 'footer', variant: 'columns', tagline: 'Coaching sportif personnalisé à Bordeaux.' },
        ],
      }],
    },
  },
];

export function sampleById(id: string): Sample | undefined {
  return samples.find((sample) => sample.id === id);
}

// Contenu d'exemple d'un type de section, dans une variante donnée (catalogue du back-office, tests).
export function catalogueSection(type: SectionType, variant: string): Section {
  const base = { variant };
  const sections: Record<SectionType, Record<string, unknown>> = {
    hero: { type: 'hero', ...base, eyebrow: 'Artisan à Nantes depuis 2008', title: 'Votre salle de bain, enfin réussie', subtitle: 'Rénovation complète clé en main, devis gratuit sous 48 heures.', highlights: ['Devis gratuit', 'Garantie décennale'], secondaryCta: { label: 'Nos réalisations', href: '#gallery' }, image: { query: 'renovated modern bathroom', alt: 'Salle de bain rénovée avec douche à l’italienne' } },
    about: { type: 'about', ...base, eyebrow: 'Qui sommes-nous', title: 'Un artisan, une équipe, un engagement', paragraphs: ['Depuis quinze ans, notre équipe rénove des salles de bain et des cuisines avec le même exigence : un chantier propre, des délais tenus, un prix annoncé.', 'Nous intervenons dans un rayon de 40 km autour de Nantes.'], highlights: ['Un seul interlocuteur du début à la fin', 'Chantier nettoyé chaque soir'], image: { query: 'plumber installing faucet', alt: 'Artisan installant une robinetterie' } },
    services: { type: 'services', ...base, eyebrow: 'Prestations', title: 'Tout pour votre habitat', intro: 'Du dépannage urgent à la rénovation complète.', items: ([{ title: 'Dépannage 7j/7', description: 'Fuite, panne de chauffe-eau : nous intervenons rapidement.', icon: 'wrench', price: 'dès 69 €' }, { title: 'Salle de bain', description: 'Conception, fourniture et pose, carrelage compris.', icon: 'droplets' }, { title: 'Chauffage', description: 'Installation et entretien de chaudières et pompes à chaleur.', icon: 'flame' }]) },
    products: { type: 'products', ...base, eyebrow: 'Notre carte', title: 'Spécialités de la maison', intro: 'Préparées chaque jour avec des produits frais.', items: ([{ name: 'Tarte aux pommes', description: 'Pommes de Loire, pâte sablée maison.', price: '4,20 €', tag: 'Maison' }, { name: 'Éclair au chocolat', description: 'Crème pâtissière au chocolat noir 70 %.', price: '3,10 €' }, { name: 'Paris-Brest', description: 'Praliné noisette, pâte à choux croustillante.', price: '4,60 €' }, { name: 'Millefeuille vanille', description: 'Vanille de Madagascar, feuilletage caramélisé.', price: '4,40 €' }]) },
    gallery: { type: 'gallery', ...base, eyebrow: 'Réalisations', title: 'Nos derniers chantiers', images: ([1, 2, 3, 4, 5, 6].map((n) => ({ image: { query: 'home renovation interior', alt: `Réalisation ${n} : intérieur rénové` }, caption: n % 2 ? 'Salle de bain, Nantes' : undefined }))) },
    testimonials: { type: 'testimonials', ...base, eyebrow: 'Avis clients', title: 'Ils nous recommandent', items: ([{ quote: 'Travail soigné, chantier propre et délais respectés : je recommande les yeux fermés.', author: 'Julie P.', role: 'Rénovation salle de bain', rating: 5 }, { quote: 'Intervention en moins de deux heures un dimanche. Merci !', author: 'Olivier T.', rating: 5 }, { quote: 'Devis clair, aucun surcoût. Une équipe sérieuse.', author: 'Marie-Anne C.', rating: 5 }]) },
    stats: { type: 'stats', ...base, title: 'En quelques chiffres', items: ([{ value: '15 ans', label: 'd’expérience' }, { value: '1 200', label: 'chantiers réalisés' }, { value: '4,8/5', label: 'avis clients' }]) },
    hours: { type: 'hours', ...base, eyebrow: 'Disponibilités', title: 'Horaires d’ouverture', intro: 'Nous sommes joignables du lundi au samedi.', rows: ([{ day: 'Lundi – Vendredi', hours: '8h00 – 18h30' }, { day: 'Samedi', hours: '9h00 – 12h00' }, { day: 'Dimanche', hours: 'Urgences uniquement' }]), note: 'Dépannage urgent 7j/7 sur appel.' },
    area: { type: 'area', ...base, eyebrow: 'Zone d’intervention', title: 'Nous intervenons près de chez vous', intro: 'Dans un rayon de 40 km autour de Nantes.', places: ['Nantes', 'Rezé', 'Saint-Herblain', 'Orvault', 'Vertou', 'Carquefou', 'Bouguenais', 'Saint-Sébastien-sur-Loire', 'La Chapelle-sur-Erdre'], note: 'Votre commune n’est pas listée ? Appelez-nous.' },
    faq: { type: 'faq', ...base, eyebrow: 'Questions fréquentes', title: 'Vos questions, nos réponses', items: ([{ question: 'Le devis est-il gratuit ?', answer: 'Oui. Nous nous déplaçons, prenons les mesures et vous remettons un devis détaillé sous 48 heures.' }, { question: 'Quels sont vos délais ?', answer: 'Une salle de bain complète se réalise en 8 à 12 jours ouvrés, selon l’ampleur des travaux.' }, { question: 'Êtes-vous assurés ?', answer: 'Nous bénéficions de la garantie décennale et d’une assurance responsabilité civile professionnelle.' }, { question: 'Peut-on payer en plusieurs fois ?', answer: 'Oui, un échéancier est possible : acompte à la commande, solde à la livraison.' }]) },
    team: { type: 'team', ...base, eyebrow: 'L’équipe', title: 'Des visages, des compétences', intro: 'Une équipe stable, formée en interne.', members: ([{ name: 'Pierre Dupont', role: 'Gérant, plombier', bio: '20 ans de métier, chef de chantier.' }, { name: 'Sarah Lambert', role: 'Conseillère habitat', bio: 'Vous accompagne dans le choix des matériaux.' }, { name: 'Yanis Benali', role: 'Carreleur', bio: 'Spécialiste des grands formats et de la faïence.' }]) },
    cta: { type: 'cta', ...base, title: 'Parlons de votre projet', text: 'Décrivez-nous vos travaux, nous vous répondons sous 24 heures.', button: { label: 'Demander un devis gratuit', href: '#contact' }, secondary: { label: 'Appeler', href: 'tel:{{company.phone}}' } },
    contact: { type: 'contact', ...base, mode: 'quote', eyebrow: 'Contact', title: 'Demandez votre devis', intro: 'Réponse sous 24 heures ouvrées.', services: ['Dépannage', 'Salle de bain', 'Chauffage', 'Autre'] },
    map: { type: 'map', ...base, eyebrow: 'Accès', title: 'Venez nous voir', intro: 'Notre showroom est ouvert sur rendez-vous.', access: ['Parking gratuit devant le showroom', 'Tramway ligne 1, arrêt Commerce'] },
    footer: { type: 'footer', ...base, tagline: 'Artisan plombier-chauffagiste à Nantes et alentours.', links: [{ label: 'Nos réalisations', href: '#gallery' }] },
    module: { type: 'module', ...base, module: 'booking', eyebrow: 'Rendez-vous', title: 'Réservez votre intervention', intro: 'Choisissez la prestation, nous confirmons le créneau sous 2 heures.' },
  };
  return sections[type] as unknown as Section;
}

// Modules fonctionnels d'exemple (catalogue, tests) : un de chaque, plausibles pour un artisan qui vend aussi des produits.
export const catalogueModules: SiteModules = {
  quote: { services: ['Dépannage', 'Salle de bain', 'Chauffage'], fields: ['address', 'date', 'photos'], responseDelay: 'Devis gratuit sous 48 heures', emergency: true },
  booking: { services: [{ name: 'Diagnostic chaudière', durationMinutes: 60, price: 89, location: 'home' }, { name: 'Entretien annuel', durationMinutes: 90, price: 129, location: 'home' }, { name: 'Conseil salle de bain au showroom', durationMinutes: 45, price: 0, location: 'onsite' }], schedule: { days: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'], start: '08:00', end: '18:00' }, slotMinutes: 30, leadTimeHours: 24, cancellationPolicy: 'Annulation gratuite jusqu’à 24 heures avant.', payment: 'deposit', depositPercent: 30, reminders: true },
  shop: { mode: 'click-collect', products: [{ name: 'Mitigeur thermostatique', description: 'Pour douche, garantie 5 ans.', price: 139, category: 'Robinetterie' }, { name: 'Pommeau de douche économe', price: 34.9, category: 'Robinetterie' }, { name: 'Kit détartrage chauffe-eau', price: 19.5, unit: 'kit', category: 'Entretien' }], pickup: { schedule: { days: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'], start: '09:00', end: '12:00' }, leadTimeHours: 24 }, payment: 'both' },
  payment: { offers: [{ name: 'Contrat d’entretien', description: 'Visite annuelle et dépannage prioritaire.', price: 12, kind: 'subscription', period: 'month' }, { name: 'Acompte travaux', description: 'Réservez votre date de chantier.', price: 300, kind: 'deposit' }, { name: 'Forfait 3 visites', price: 330, kind: 'pack', sessions: 3 }] },
  newsletter: { incentive: 'Nos conseils de saison pour économiser l’énergie.', frequency: 'Une lettre par trimestre' },
  clientArea: { features: ['documents', 'invoices', 'appointments'] },
  widgets: [{ type: 'whatsapp', message: 'Bonjour, j’ai une question.' }, { type: 'google-reviews' }],
  webhooks: { events: ['quote.created', 'booking.created'] },
};

const MODULE_TITLES: Record<DisplayModule, { eyebrow: string; title: string; intro: string }> = {
  quote: { eyebrow: 'Devis gratuit', title: 'Décrivez vos travaux', intro: 'Quelques informations suffisent pour un devis précis.' },
  booking: { eyebrow: 'Rendez-vous', title: 'Réservez votre intervention', intro: 'Choisissez la prestation, nous confirmons le créneau sous 2 heures.' },
  shop: { eyebrow: 'Boutique', title: 'Commandez, retirez à l’atelier', intro: 'Pièces et accessoires sélectionnés par nos plombiers.' },
  payment: { eyebrow: 'Tarifs', title: 'Nos formules', intro: 'Des prix clairs, sans surprise.' },
  newsletter: { eyebrow: 'Restons en contact', title: 'Recevez nos conseils', intro: 'Pas de publicité, uniquement des conseils utiles.' },
  clientArea: { eyebrow: 'Espace client', title: 'Retrouvez votre dossier', intro: 'Devis, factures et rendez-vous au même endroit.' },
};

// Le catalogue empile toutes les variantes d'un type : il contourne volontairement les règles de page du schéma (un seul hero, un seul formulaire…).
export function catalogueSite(style: StyleId, palette: string | undefined, type: SectionType): SiteDescription {
  const sections = type === 'module'
    ? displayModules.flatMap((module) => sectionVariants.module.map((variant) => ({ type: 'module', variant, module, ...MODULE_TITLES[module] }) as Section))
    : sectionVariants[type].map((variant) => catalogueSection(type, variant));
  return {
    modules: catalogueModules,
    version: 1,
    theme: { style, palette },
    seo: { title: `Catalogue — ${type}`, description: 'Variantes de la section dans le style choisi.' },
    primaryCta: { label: 'Demander un devis', href: '#contact' },
    pages: [{ slug: 'index', title: 'Catalogue', sections }],
  };
}

type PhotoEntry = { src: string; credit: { name: string; url: string } };

// Complète les emplacements d'images des exemples avec les photos récupérées par scripts/fetch-sample-photos.ts (si présentes).
export function withSamplePhotos<T>(value: T): T {
  const library = photos as Record<string, PhotoEntry>;
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(visit);
    if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>;
      const mapped = Object.fromEntries(Object.entries(record).map(([key, child]) => [key, visit(child)]));
      const photo = typeof record.query === 'string' && typeof record.alt === 'string' && !record.src ? library[record.query] : undefined;
      return photo ? { ...mapped, src: photo.src, credit: photo.credit } : mapped;
    }
    return node;
  };
  return visit(value) as T;
}
