-- Phase Q, lot 5 : la saisie manuelle de l'onboarding (entreprise sans SIRET) crée une vraie fiche entreprise.
ALTER TABLE "companies" ALTER COLUMN "siret" DROP NOT NULL;
ALTER TABLE "companies" ALTER COLUMN "siren" DROP NOT NULL;
