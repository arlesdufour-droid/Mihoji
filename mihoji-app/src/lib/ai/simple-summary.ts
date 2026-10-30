export function simpleSummary(prompt: string) {
  const normalized = prompt.trim().toLowerCase();
  if (normalized.includes('accueil') || normalized.includes('chaleureuse')) return 'J’ai ajouté une phrase d’accueil chaleureuse en haut de la page.';
  if (normalized.includes('horaire') || normalized.includes('heures')) return 'J’ai ajouté une section Horaires à votre page.';
  return 'J’ai appliqué votre demande au site. Vous pouvez vérifier le résultat dans l’aperçu.';
}
