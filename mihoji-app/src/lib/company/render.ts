import { legalFormLabel, nafLabel } from './lookup';

export type CompanyRenderInfo = {
  name: string;
  activity: string;
  address: string;
  legalForm: string;
  email?: string | null;
  phone?: string | null;
  missingFields?: unknown;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character);
}

// Ville déduite de l'adresse (« 12 rue des Lilas, 17000 La Rochelle » → « La Rochelle »).
export function cityOf(address: string): string {
  return address.match(/\b\d{5}\s+([^,\n]+?)\s*(?:cedex\b.*)?$/i)?.[1]?.trim() ?? '';
}

// Les éléments marqués data-company-opt="phone|email" disparaissent quand la donnée est absente.
function dropEmptyOptionals(html: string, values: Record<string, string>): string {
  let out = html;
  for (const key of ['phone', 'email']) {
    if (!values[key]) out = out.replace(new RegExp(`<li\\b[^>]*data-company-opt="${key}"[^>]*>[\\s\\S]*?<\\/li>`, 'g'), '');
  }
  return out;
}

export function injectCompanyData(html: string, company: CompanyRenderInfo | null | undefined): string {
  if (!company) return dropEmptyOptionals(html, {}).replace(/\{\{company\.[a-zA-Z]+\}\}/g, '');
  const fields = company.missingFields && typeof company.missingFields === 'object' ? company.missingFields as Record<string, string> : {};
  const values: Record<string, string> = {
    name: company.name,
    activity: nafLabel(company.activity),
    legalForm: legalFormLabel(company.legalForm),
    address: company.address,
    email: fields.email ?? company.email ?? '',
    phone: fields.phone ?? company.phone ?? '',
    city: cityOf(company.address),
  };
  let out = dropEmptyOptionals(html, values).replace(/\{\{company\.([a-zA-Z]+)\}\}/g, (_token, key: string) => escapeHtml(values[key] ?? ''));
  if (values.activity) out = out.replace(/\b\d{2}\.\d{2}[A-Z]\b/g, escapeHtml(values.activity));
  return out;
}
