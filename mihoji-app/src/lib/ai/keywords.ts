const STOP_WORDS = new Set(['avec', 'dans', 'pour', 'vous', 'votre', 'vos', 'une', 'des', 'les', 'aux', 'sur', 'par', 'qui', 'que', 'est', 'sont', 'cette', 'ces', 'mes', 'tes', 'ses', 'nos', 'leur', 'leurs', 'plus', 'moins', 'très', 'aussi', 'comme', 'entre', 'vers', 'chez', 'sans', 'sous', 'tout', 'tous', 'toute', 'toutes', 'être', 'avoir', 'faire', 'peut', 'veux', 'voudrais', 'souhaite', 'ajoute', 'ajouter', 'modifie', 'modifier', 'change', 'changer', 'supprime', 'supprimer', 'mets', 'mettre', 'crée', 'créer', 'section', 'page', 'site', 'texte', 'couleur', 'titre', 'titres', 'image', 'images', 'bouton', 'lien', 'menu', 'haut', 'bas', 'gauche', 'droite', 'centre']);

export function keywordsOf(text: string): string[] {
  return [...new Set(text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]{4,}/g) ?? [])].filter((word) => !STOP_WORDS.has(word));
}
