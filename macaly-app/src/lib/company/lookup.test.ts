import { describe, expect, it } from 'vitest';
import { isValidSiret, lookupDemoCompany, vatNumberFromSiren } from './lookup';

describe('company lookup', () => {
  it('validates a SIRET with the Luhn key', () => {
    expect(isValidSiret('73282932000074')).toBe(true);
    expect(isValidSiret('73282932000075')).toBe(false);
  });

  it('returns simulated company data and VAT number', () => {
    const company = lookupDemoCompany('73282932000074');
    expect(company.status).toBe('active');
    expect(company.siren).toBe('732829320');
    expect(company.vatNumber).toBe(vatNumberFromSiren('732829320'));
  });
});
