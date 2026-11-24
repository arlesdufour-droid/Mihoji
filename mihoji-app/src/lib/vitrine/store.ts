import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { injectCompanyData } from '../company/render';
import { renderSite } from '../site/render';
import { siteSchema, type SiteDescription } from '../site/schema';
import { vitrineCases, VITRINE_NOTICE, type VitrineCase } from './cases';

// Sites d'exemple de la vitrine, versionnés dans le dépôt : src/content/vitrine/<slug>.json (description structurée) et public/vitrine/<slug>/ (photos).
// La vitrine lit ces fichiers : elle ne dépend ni de l'IA ni de la base au moment de l'affichage.
export const VITRINE_DIR = () => resolve(process.cwd(), 'src/content/vitrine');
export const VITRINE_PHOTOS_DIR = () => resolve(process.cwd(), 'public/vitrine');

export type VitrineEntry = {
  slug: string; label: string; family: string; module: VitrineCase['module']; request: string;
  company: VitrineCase['company']; profile: VitrineCase['profile'];
  model: string; costEur: number; attempts: number; generatedAt: string; photos: number;
  description: unknown;
};

export function readVitrineEntry(slug: string): VitrineEntry | null {
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return null;
  const file = resolve(VITRINE_DIR(), `${slug}.json`);
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, 'utf8')) as VitrineEntry; } catch { return null; }
}

// Les entrées présentes, dans l'ordre des cas.
export function listVitrineEntries(): VitrineEntry[] {
  return vitrineCases.flatMap((item) => { const entry = readVitrineEntry(item.slug); return entry ? [entry] : []; });
}

export function parseDescription(entry: VitrineEntry): SiteDescription {
  return siteSchema.parse(entry.description);
}

// Rendu avec le moteur actuel des sites (description structurée), mention « entreprise fictive » visible en permanence ; les formulaires sont inertes (exemple).
export function renderVitrineHtml(entry: VitrineEntry): string {
  const html = renderSite(parseDescription(entry), { inlineCss: true, notice: VITRINE_NOTICE }).files['index.html']
    // Exemple : aucun formulaire n'envoie quoi que ce soit ; ils mènent à une page qui l'explique.
    .replace(/action="\/api\/public\/(?:leads|bookings|orders)"/g, `action="${DEMO_FORM_ACTION}"`);
  return injectCompanyData(html.replaceAll('{{site.id}}', 'exemple'), { name: entry.company.name, activity: entry.company.activity, legalForm: 'Entreprise fictive (exemple)', address: entry.company.address, email: entry.company.email, phone: entry.company.phone, missingFields: { phone: entry.company.phone, email: entry.company.email } });
}

// Choix « garder » (page /admin/vitrine) : src/content/vitrine/keep.json.
export type KeepChoices = Record<string, boolean>;

// Fichier des choix : VITRINE_KEEP_FILE le remplace pendant les tests e2e, pour qu'aucun test ne touche jamais au vrai choix.
const keepFile = () => (process.env.VITRINE_KEEP_FILE ? resolve(process.cwd(), process.env.VITRINE_KEEP_FILE) : resolve(VITRINE_DIR(), 'keep.json'));

export function readKeep(): KeepChoices {
  const file = keepFile();
  if (!existsSync(file)) return {};
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'));
  } catch { return {}; }
}

export function writeKeep(slug: string, keep: boolean): KeepChoices | null {
  if (!vitrineCases.some((item) => item.slug === slug)) return null;
  const choices = { ...readKeep(), [slug]: keep };
  mkdirSync(resolve(keepFile(), '..'), { recursive: true });
  writeFileSync(keepFile(), `${JSON.stringify(choices, null, 2)}\n`);
  return choices;
}

// Sites montrés sur la page d'accueil et dans /exemples : ceux cochés « garder » dans /admin/vitrine. Sans aucun choix enregistré (dépôt neuf), tous les sites présents.
export function listKeptEntries(): VitrineEntry[] {
  const choices = readVitrineKeepForPublic();
  const entries = listVitrineEntries();
  return Object.keys(choices).length === 0 ? entries : entries.filter((entry) => choices[entry.slug]);
}

export function keptEntryBySlug(slug: string): VitrineEntry | null {
  return listKeptEntries().find((entry) => entry.slug === slug) ?? null;
}

// Les pages publiques lisent TOUJOURS le vrai fichier de choix (le remplacement de test ne concerne que /admin/vitrine).
function readVitrineKeepForPublic(): KeepChoices {
  const file = resolve(VITRINE_DIR(), 'keep.json');
  if (!existsSync(file)) return {};
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'));
  } catch { return {}; }
}

export const moduleLabels: Record<VitrineEntry['module'], string> = { quote: 'Demande de devis en ligne', 'booking-deposit': 'Rendez-vous en ligne avec acompte', booking: 'Prise de rendez-vous en ligne', shop: 'Petite boutique, retrait en magasin' };
export const DEMO_FORM_ACTION = '/exemples/entreprise-fictive';
