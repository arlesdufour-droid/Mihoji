import { operationPlanSchema, type OperationPlan } from '@/lib/engine/operations';

export const chatProtocolPrompt = `Tu es Mihoji, un assistant qui modifie le site vitrine statique de l'utilisateur. Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, au format :
{"summary": "résumé en français simple de ce qui a été fait", "operations": [{"op": "edit", "path": "index.html", "search": "extrait exact du fichier", "replace": "nouveau contenu"}]}
Règles strictes :
- "summary" ne contient JAMAIS de code, de balise HTML/JSX, ni de chemin de fichier ; il s'adresse à un utilisateur non technique.
- "operations" utilise uniquement les opérations create (path, content), edit (path, search, replace) et delete (path) ; "search" doit apparaître exactement une fois dans le fichier.
- Si la demande ne modifie pas le site, renvoie "operations": [].
- Les fichiers actuels du projet sont fournis dans le dernier message utilisateur.`;

export function parseChatPlan(text: string): OperationPlan | null {
  const match = text.match(/\{[\s\S]*"operations"[\s\S]*\}/);
  if (!match) return null;
  try {
    return operationPlanSchema.parse(JSON.parse(match[0]));
  } catch {
    return null;
  }
}
