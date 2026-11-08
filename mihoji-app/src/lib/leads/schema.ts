import { z } from 'zod';

// Demande envoyée par un formulaire de site : validée strictement côté serveur (jamais de confiance au navigateur).
const clean = (max: number) => z.string().trim().max(max);

export const leadSchema = z.object({
  site: z.string().uuid(),
  kind: z.enum(['quote', 'contact']).default('contact'),
  nom: clean(120).min(1),
  email: clean(200).email(),
  telephone: clean(40).regex(/^[\d\s+().-]*$/, 'téléphone invalide').default(''),
  prestation: clean(120).default(''),
  message: clean(4000).min(1),
  // Champ piège invisible : un robot le remplit, un humain jamais.
  website: clean(200).default(''),
  address: clean(200).optional(), date: clean(40).optional(), budget: clean(60).optional(), surface: clean(60).optional(), photos: clean(200).optional(),
});
export type LeadInput = z.infer<typeof leadSchema>;

// Champs complémentaires du devis (adresse du chantier, date, budget, surface) conservés tels quels.
export function leadExtra(input: LeadInput): Record<string, string> {
  return Object.fromEntries((['address', 'date', 'budget', 'surface'] as const).flatMap((key) => (input[key] ? [[key, input[key]!]] : [])));
}

export const EXTRA_LABELS: Record<string, string> = { address: 'Adresse du chantier', date: 'Date souhaitée', budget: 'Budget', surface: 'Surface' };
