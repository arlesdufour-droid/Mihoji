import { getSession } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { injectCompanyData } from '@/lib/company/render';
import { renderSite } from '@/lib/site/render';
import { catalogueSite, sampleById, withSamplePhotos, type SampleCompany } from '@/lib/site/samples';
import { sectionTypes, siteSchema, styleIds, type SectionType, type SiteDescription } from '@/lib/site/schema';

const catalogueCompany: SampleCompany = { name: 'Atelier Dupont', activity: 'Plomberie et chauffage', address: '12 rue des Artisans, 44000 Nantes', legalForm: 'EI', email: 'contact@atelier-dupont.fr', phone: '02 40 00 11 22' };

function page(site: SiteDescription, company: SampleCompany): Response {
  const output = renderSite(site, { inlineCss: true });
  const html = injectCompanyData(output.files['index.html'], { ...company, missingFields: {} });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}

// Pages de contrôle du design (administrateurs) : sites d'exemple et catalogue de toutes les variantes de sections.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return new Response('forbidden', { status: 403 });
  const params = new URL(request.url).searchParams;
  const style = styleIds.find((id) => id === params.get('style'));
  const palette = params.get('palette') ?? undefined;

  const sampleId = params.get('sample');
  if (sampleId) {
    const sample = sampleById(sampleId);
    if (!sample) return new Response('not_found', { status: 404 });
    const site = siteSchema.parse(sample.site);
    if (style) site.theme = { style, palette };
    return page(withSamplePhotos(site), sample.company);
  }

  const type = sectionTypes.find((candidate) => candidate === params.get('catalogue')) as SectionType | undefined;
  if (type) return page(withSamplePhotos(catalogueSite(style ?? 'artisan', palette, type)), catalogueCompany);
  return new Response('bad_request', { status: 400 });
}
