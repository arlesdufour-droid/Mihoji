import { describe, expect, it } from 'vitest';
import { listVitrineEntries, parseDescription } from '@/lib/vitrine/store';
import { companyForSnapshot, renderSnapshotFiles, siteSecurityHeaders, type PublishedSnapshot } from './snapshot';

// Étape 4 : les modules (devis, rendez-vous avec acompte, boutique) fonctionnent depuis un sous-domaine ou un domaine personnalisé :
// les formulaires, polices et photos sont des adresses absolues vers l'application, et la politique de sécurité les autorise (et seulement elles).
const APP = 'https://app.mihoji.example';
const company = companyForSnapshot({ name: 'Entreprise Test', activity: 'Test', address: '1 rue Test, 75001 Paris', legalForm: 'SAS', email: 'a@test.example', phone: '01 99 00 00 00' });
const snapshotOf = (entry: ReturnType<typeof listVitrineEntries>[number], assetOrigin: string | null): PublishedSnapshot => ({ v: 1, projectId: '22222222-2222-4222-8222-222222222222', assetOrigin, company, site: parseDescription(entry), files: null });

describe('modules des sites publiés', () => {
  const entries = listVitrineEntries();

  it('les exemples couvrent devis, rendez-vous avec acompte et boutique', () => {
    expect(new Set(entries.map((entry) => entry.module))).toEqual(new Set(['quote', 'booking-deposit', 'booking', 'shop']));
  });

  it.each(entries.map((entry) => [entry.slug, entry] as const))('%s : tous les formulaires envoient vers l’application en adresse absolue', (_slug, entry) => {
    const files = renderSnapshotFiles(snapshotOf(entry, APP));
    const html = Object.values(files).join('\n');
    const actions = [...html.matchAll(/<form[^>]*action="([^"]+)"/g)].map((match) => match[1]);
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) expect(action, entry.slug).toMatch(new RegExp(`^${APP.replace(/\./g, '\\.')}/api/public/(leads|bookings|orders)$`));
    expect(html).not.toMatch(/src="\/api\//);
    expect(html).toContain('name="site" value="22222222-2222-4222-8222-222222222222"'); // le site est reconnu par son identifiant
  });

  it('sans adresse publique connue (développement), les formulaires restent relatifs et passent par le nom d’hôte du site', () => {
    const files = renderSnapshotFiles(snapshotOf(entries[0], null));
    expect(Object.values(files).join('\n')).toMatch(/action="\/api\/public\//);
  });

  it('la politique de sécurité autorise l’envoi à l’application et à Stripe, rien d’autre', () => {
    const csp = siteSecurityHeaders(APP)['Content-Security-Policy'];
    expect(csp).toContain(`form-action 'self' ${APP} https://checkout.stripe.com`);
    expect(csp).toContain(`font-src 'self' ${APP}`);
    expect(csp).not.toContain('*');
  });
});
