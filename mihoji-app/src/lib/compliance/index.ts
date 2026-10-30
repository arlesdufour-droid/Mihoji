type Company = {
  name: string;
  legalForm: string;
  siren: string;
  address: string;
  activity: string;
  missingFields?: unknown;
};

const requiredFields = ['director', 'email', 'phone'];

export function complianceStatus(company: Company | null) {
  const fields = company?.missingFields && typeof company.missingFields === 'object' ? company.missingFields as Record<string, string> : {};
  const missing = company ? requiredFields.filter((field) => !(fields[field] ?? '').trim()) : requiredFields;
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
