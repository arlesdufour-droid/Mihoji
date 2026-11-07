// Requêtes de la bibliothèque locale de photos (repli sans clé Unsplash, banc d'essai).
// Par métier : le geste, le lieu et le produit ou l'outil, pour que le choix par mots-clés trouve une photo adaptée à chaque emplacement.
// Ordre = priorité : les métiers du banc d'essai d'abord.
export const libraryQueries: string[] = [
  // plombier, peintre, électricien, maçon, menuisier, couvreur
  'plumber wrench tightening copper pipe', 'plumber repairing kitchen sink leak', 'water heater boiler installation technician', 'bathroom renovation tiles shower',
  'house painter roller painting wall', 'painter brush paint cans interior', 'electrician wiring socket installation', 'electrician tools cables workshop',
  'mason bricklayer building wall', 'carpenter measuring wood plank', 'carpenter workshop furniture sanding', 'roofer installing roof tiles',
  // boulangerie, pâtisserie, restaurant, café
  'baker pulling loaves from oven', 'bakery counter fresh baguettes display', 'croissants pastry tray bakery', 'sourdough bread loaf flour',
  'chef cooking restaurant kitchen', 'restaurant dining room tables interior', 'plated dish gourmet restaurant', 'wine glasses restaurant table dinner',
  // santé, bien-être, sport
  'physiotherapist massage patient back', 'physiotherapy exercise rehabilitation clinic', 'osteopath treating patient', 'yoga woman stretching studio',
  'personal trainer coaching client gym', 'fitness coach outdoor training', 'kettlebell workout gym equipment', 'running outdoors morning fitness',
  // juridique, conseil, bureau
  'lawyer reviewing documents desk', 'law books library office', 'business meeting handshake consultant', 'consultant presenting whiteboard team meeting',
  'accountant calculator financial documents', 'notary signing contract pen',
  // fleuriste, jardin, commerce
  'florist arranging bouquet flowers', 'flower shop interior bouquets', 'gardener pruning plants garden', 'landscaping garden lawn terrace',
  'small shop owner behind counter', 'boutique interior shelves products', 'butcher shop meat counter', 'cheese shop counter dairy', 'coffee roaster barista espresso',
  // garage, auto
  'car mechanic repairing engine garage', 'mechanic changing tire wheel', 'auto garage workshop lift car', 'car brake inspection technician',
  // photographe, créatif
  'photographer holding camera outdoors', 'wedding photographer couple', 'photo studio lighting portrait', 'portrait photography camera lens',
  // beauté, services
  'hairdresser cutting hair salon', 'barber shaving beard shop', 'beauty salon manicure nails', 'cleaning professional vacuum home',
  'locksmith opening door lock', 'moving company boxes van', 'real estate agent house keys', 'dentist dental clinic patient', 'veterinarian examining dog',
  'tailor sewing machine fabric', 'jeweler workshop ring craft', 'tattoo artist studio', 'event planner wedding table decoration',
];
