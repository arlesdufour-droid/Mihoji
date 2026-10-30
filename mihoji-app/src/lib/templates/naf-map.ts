export type TemplateFamily = 'Artisans et BTP' | 'Restauration et commerce' | 'Santé, bien-être et professions libérales' | 'Conseil, coaching et formation' | 'Entreprise';

const families: Array<{ family: TemplateFamily; keywords: string[] }> = [
  { family: 'Artisans et BTP', keywords: ['plomb', 'électric', 'maçon', 'menuis', 'bâtiment', 'construction'] },
  { family: 'Restauration et commerce', keywords: ['restaurant', 'boulanger', 'boutique', 'commerce', 'épicer', 'vente'] },
  { family: 'Santé, bien-être et professions libérales', keywords: ['kiné', 'ostéo', 'coiff', 'avocat', 'comptab', 'santé'] },
  { family: 'Conseil, coaching et formation', keywords: ['consult', 'coach', 'form', 'conseil'] },
];

export function familyForActivity(activity: string): TemplateFamily {
  const normalized = activity.toLocaleLowerCase('fr-FR');
  return families.find(({ keywords }) => keywords.some((keyword) => normalized.includes(keyword)))?.family ?? 'Entreprise';
}
