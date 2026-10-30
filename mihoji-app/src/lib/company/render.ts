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

export function injectCompanyData(html: string, company: CompanyRenderInfo | null | undefined): string {
  if (!company) return html.replace(/\{\{company\.[a-zA-Z]+\}\}/g, '');
  const fields = company.missingFields && typeof company.missingFields === 'object' ? company.missingFields as Record<string, string> : {};
  const values: Record<string, string> = {
    name: company.name,
    activity: nafLabel(company.activity),
    legalForm: legalFormLabel(company.legalForm),
    address: company.address,
    email: fields.email ?? company.email ?? '',
    phone: fields.phone ?? company.phone ?? '',
  };
  let out = html.replace(/\{\{company\.([a-zA-Z]+)\}\}/g, (_token, key: string) => escapeHtml(values[key] ?? ''));
  if (values.activity) out = out.replace(/\b\d{2}\.\d{2}[A-Z]\b/g, escapeHtml(values.activity));
  return out;
}
