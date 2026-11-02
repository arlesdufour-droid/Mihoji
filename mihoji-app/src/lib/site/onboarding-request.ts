import { z } from 'zod';
import { cityOf } from '@/lib/company/render';
import { nafLabel } from '@/lib/company/lookup';
import { styleIds } from './schema';

// Logique pure de l'écran « Décrivez le site que vous voulez » (testée sans réseau).

export const REQUEST_MIN = 8;
export const REQUEST_MAX = 2_000;

export const requestExamples = [
  'Je veux un site chaleureux avec prise de commande en ligne',
  'Un site sobre et professionnel pour recevoir des demandes de devis',
  'Un site élégant qui met mes photos en valeur et permet de prendre rendez-vous',
] as const;

export const onboardingSiteSchema = z.object({
  request: z.string().trim().min(REQUEST_MIN).max(REQUEST_MAX),
  style: z.enum(styleIds).optional(),
});

export type OnboardingCompany = {
  name: string;
  activity: string;
  address: string;
  missingFields?: unknown;
};

// Données entreprise transmises au modèle : le métier vient de l'activité déclarée, jamais de la demande seule.
export function designCompanyOf(company: OnboardingCompany) {
  const fields = company.missingFields && typeof company.missingFields === 'object' ? company.missingFields as Record<string, string> : {};
  const activity = nafLabel(company.activity);
  return {
    trade: activity,
    company: {
      name: company.name,
      activity,
      city: cityOf(company.address),
      address: company.address,
      hasPhone: Boolean(fields.phone?.trim()),
      hasEmail: Boolean(fields.email?.trim()),
    },
  };
}

export function projectNameOf(company: OnboardingCompany): string {
  return company.name.trim().slice(0, 80) || 'Mon site';
}
