import nafLabelsJson from './naf-labels.json';
export type CompanyLookup = {
  siret: string;
  siren: string;
  name: string;
  legalForm: string;
  address: string;
  activity: string;
  createdAt: string;
  vatNumber: string;
  status: 'active' | 'closed';
};

const legalForms: Record<string, string> = {
  '5710': 'SAS, société par actions simplifiée',
  '5499': 'SARL, société à responsabilité limitée',
  '1000': 'Entrepreneur individuel',
  '5306': 'SA à conseil d’administration',
};

// Nomenclature INSEE complète (NAF rév. 2, 2008, niveau 5 : 732 sous-classes), source : insee.fr, fichier naf2008_liste_n5.
const nafLabels: Record<string, string> = nafLabelsJson;

// « 4322A », « 43.22a » et « 43.22A » désignent la même sous-classe.
export function normalizeNaf(code: string): string | null {
  const match = code.trim().toUpperCase().match(/^(\d{2})\.?(\d{2})([A-Z])$/);
  return match ? `${match[1]}.${match[2]}${match[3]}` : null;
}

export function legalFormLabel(code: string | null | undefined) {
  if (!code) return 'Forme juridique non renseignée';
  if (code === 'Entreprise enregistrée') return 'Entreprise individuelle';
  return legalForms[code] ?? code;
}

export function nafLabel(code: string | null | undefined) {
  if (!code) return 'Activité non renseignée';
  const normalized = normalizeNaf(code);
  return (normalized && nafLabels[normalized]) ?? code;
}

export function isValidSiret(value: string) {
  const normalized = value.replace(/\s/g, '');
  if (!/^\d{14}$/.test(normalized)) return false;
  let sum = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    let digit = Number(normalized[index]);
    if (index % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
  }
  return sum % 10 === 0;
}

export function isValidSiren(value: string) {
  if (!/^\d{9}$/.test(value)) return false;
  if (value === '356000000') return true;
  let sum = 0;
  for (let index = 0; index < value.length; index += 1) {
    let digit = Number(value[index]);
    if (index % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export function vatNumberFromSiren(siren: string) {
  const key = (12 + 3 * (Number(siren) % 97)) % 97;
  return `FR${String(key).padStart(2, '0')}${siren}`;
}

export function lookupDemoCompany(siret: string): CompanyLookup {
  const normalized = siret.replace(/\s/g, '');
  if (!isValidSiret(normalized)) throw new Error('siret_invalid');
  const siren = normalized.slice(0, 9);
  return {
    siret: normalized,
    siren,
    name: 'Entreprise de démonstration',
    legalForm: 'Société à responsabilité limitée',
    address: '10 rue de la Démonstration, 75001 Paris',
    activity: 'Création de sites internet',
    createdAt: '2020-01-15',
    vatNumber: vatNumberFromSiren(siren),
    status: 'active',
  };
}
