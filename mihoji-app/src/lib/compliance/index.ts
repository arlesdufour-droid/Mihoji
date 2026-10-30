type Company = {
  name: string;
  legalForm: string;
  siren: string;
  address: string;
  activity: string;
  missingFields?: unknown;
  email?: string | null;
  phone?: string | null;
};

const requiredFields = ['director', 'capital', 'registry', 'email', 'phone'];

export const complianceFieldLabels: Record<string, string> = {
  director: 'Directeur de la publication',
  capital: 'Capital social',
  registry: 'Numéro RCS ou RM',
  email: 'Email de contact',
  phone: 'Téléphone de contact',
};

export function complianceMissingLabels(missing: string[]) {
  return missing.map((field) => complianceFieldLabels[field] ?? field);
}

export function complianceStatus(company: Company | null) {
  const fields = company?.missingFields && typeof company.missingFields === 'object' ? company.missingFields as Record<string, string> : {};
  const values: Record<string, string> = { ...fields, email: fields.email ?? company?.email ?? '', phone: fields.phone ?? company?.phone ?? '' };
  const missing = company ? requiredFields.filter((field) => !(values[field] ?? '').trim()) : requiredFields;
  return { complete: Boolean(company) && missing.length === 0, missing };
}

export function generateComplianceDocuments(company: Company) {
  const status = complianceStatus(company);
  if (!status.complete) throw new Error('compliance_incomplete');
  const identity = `${company.name}, ${company.legalForm}, SIREN ${company.siren}, ${company.address}`;
  const fields = company.missingFields && typeof company.missingFields === 'object' ? company.missingFields as Record<string, string> : {};
  return {
    'legal-notice.md': `# Mentions légales\n\n${identity}.\n\nActivité : ${company.activity}.\n\nDirecteur de la publication : ${fields.director}.`,
    'privacy-policy.md': `# Politique de confidentialité\n\n${identity} traite les données nécessaires au fonctionnement du service.`,
    'cookies.md': '# Bandeau cookies\n\nMihoji n’utilise que les cookies nécessaires au fonctionnement du service.',
  };
}
