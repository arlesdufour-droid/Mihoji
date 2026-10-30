import { NextResponse } from 'next/server';
import { and, eq, gt } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { companyLookupCache } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { isValidSiret, vatNumberFromSiren, type CompanyLookup } from '@/lib/company/lookup';

type GovernmentResult = {
  siren: string;
  nom_complet?: string;
  nom_raison_sociale?: string;
  siege?: {
    siret?: string;
    adresse?: string;
    activite_principale?: string;
    date_creation?: string;
    date_fermeture?: string | null;
    etat_administratif?: string;
  };
};

function toCompany(result: GovernmentResult, siret: string): CompanyLookup {
  const headquarters = result.siege;
  if (!headquarters || headquarters.etat_administratif !== 'A' || headquarters.date_fermeture) throw new Error('company_closed');
  return {
    siret: headquarters.siret ?? siret,
    siren: result.siren,
    name: result.nom_complet ?? result.nom_raison_sociale ?? 'Entreprise',
    legalForm: 'Entreprise enregistrée',
    address: headquarters.adresse ?? 'Adresse non renseignée',
    activity: headquarters.activite_principale ?? 'Activité non renseignée',
    createdAt: headquarters.date_creation ?? new Date().toISOString().slice(0, 10),
    vatNumber: vatNumberFromSiren(result.siren),
    status: 'active',
  };
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const siret = new URL(request.url).searchParams.get('siret')?.replace(/\s/g, '') ?? '';
  if (!isValidSiret(siret)) return NextResponse.json({ error: 'siret_invalid' }, { status: 400 });
  const db = getDb();
  const [cached] = await db.select({ payload: companyLookupCache.payload }).from(companyLookupCache).where(and(eq(companyLookupCache.query, siret), gt(companyLookupCache.expiresAt, new Date()))).limit(1);
  if (cached) return NextResponse.json(cached.payload);

  const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siret)}`, { headers: { accept: 'application/json' } });
  if (response.status === 429) return NextResponse.json({ error: 'lookup_rate_limit' }, { status: 429 });
  if (!response.ok) return NextResponse.json({ error: 'lookup_unavailable' }, { status: 502 });
  const data = await response.json() as { results?: GovernmentResult[] };
  const result = data.results?.find((entry) => entry.siege?.siret === siret) ?? data.results?.[0];
  if (!result) return NextResponse.json({ error: 'company_not_found' }, { status: 404 });
  try {
    const company = toCompany(result, siret);
    await db.insert(companyLookupCache).values({ query: siret, payload: company, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }).onConflictDoUpdate({ target: companyLookupCache.query, set: { payload: company, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    return NextResponse.json(company);
  } catch (error) {
    if (error instanceof Error && error.message === 'company_closed') return NextResponse.json({ error: 'company_closed' }, { status: 410 });
    throw error;
  }
}
