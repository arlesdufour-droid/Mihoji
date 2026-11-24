import type { CompanyLookup } from '@/lib/company/lookup';

// Projet tel que le Studio et les réglages le lisent (GET /api/projects/<id>). L'ancien générateur de sites de démonstration (createDemoProject, gabarits HTML Tailwind)
// et ses exemples de la page d'accueil ont été supprimés : les exemples sont maintenant de vrais sites rendus par le moteur de description structurée (src/lib/vitrine).
export type DemoProject = {
  id: string;
  name: string;
  family: string;
  company: CompanyLookup;
  missingFields: Record<string, string>;
  html: string;
  createdAt: string;
};
