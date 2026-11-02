import { describe, expect, it } from 'vitest';
import { MockProvider } from '../ai/providers/mock';
import type { Complete } from './design';
import { applyEditPlan, auditEdit, restorePhotos, stripPhotos, type EditPlan } from './edit';
import { editSiteDesign } from './edit-run';
import { editSystemPrompt, editUserMessage } from './edit-prompt';
import { samples, withSamplePhotos } from './samples';
import { siteSchema, type SiteDescription } from './schema';

const base = (): SiteDescription => siteSchema.parse(withSamplePhotos(samples.find((sample) => sample.id === 'boulangerie')!.site));
const plan = (...operations: EditPlan['operations']): EditPlan => ({ summary: 'ok', operations });
const typeIndex = (site: SiteDescription, type: string) => site.pages[0].sections.findIndex((section) => section.type === type);
const faqSection = { type: 'faq', variant: 'accordion', title: 'Vos questions', items: [
  { question: 'Peut-on commander à l’avance ?', answer: 'Oui, appelez-nous la veille avant 17 h.' },
  { question: 'Où se garer ?', answer: 'Un parking gratuit se trouve à deux pas de la boutique.' },
  { question: 'Les pains sont-ils bio ?', answer: 'Notre farine est issue de blés cultivés en agriculture raisonnée.' },
] };

function applyOk(site: SiteDescription, editPlan: EditPlan) {
  const result = applyEditPlan(site, editPlan);
  if (!result.ok) throw new Error(result.errors.join(' | '));
  return result.applied;
}

describe('opérations sur la description du site', () => {
  it('modifie un seul champ d’une section sans toucher aux autres sections', () => {
    const site = base();
    const hero = typeIndex(site, 'hero');
    const applied = applyOk(site, plan({ op: 'updateSection', index: hero, set: { title: 'Le pain du quartier, chaque matin' } }));
    expect((applied.site.pages[0].sections[hero] as { title: string }).title).toBe('Le pain du quartier, chaque matin');
    applied.site.pages[0].sections.forEach((section, position) => {
      if (position !== hero) expect(section).toEqual(site.pages[0].sections[position]);
    });
    expect(auditEdit(site, applied)).toEqual([]);
  });

  it('insère, supprime et déplace des sections', () => {
    const site = base();
    const footer = typeIndex(site, 'footer');
    const inserted = applyOk(site, plan({ op: 'insertSection', index: footer, section: faqSection }));
    expect(inserted.site.pages[0].sections[footer].type).toBe('faq');
    expect(inserted.site.pages[0].sections.at(-1)?.type).toBe('footer');
    expect(auditEdit(site, inserted)).toEqual([]);

    const reviews = typeIndex(site, 'testimonials');
    const removed = applyOk(site, plan({ op: 'removeSection', index: reviews }));
    expect(removed.site.pages[0].sections.some((section) => section.type === 'testimonials')).toBe(false);
    expect(auditEdit(site, removed)).toEqual([]);
    const about = typeIndex(site, 'about');
    const moved = applyOk(site, plan({ op: 'moveSection', from: about, to: about + 1 }));
    expect(moved.moved).toBe(true);
    expect(auditEdit(site, moved)).toEqual([]);
  });

  it('refuse les opérations invalides avec une raison lisible', () => {
    const site = base();
    const cases: [EditPlan, RegExp][] = [
      [plan({ op: 'updateSection', index: 99, set: { title: 'x' } }), /pas de section à cet index/],
      [plan({ op: 'updateSection', index: 1, set: { type: 'faq' } }), /type d’une section ne change pas/],
      [plan({ op: 'updateSection', index: typeIndex(site, 'hero'), set: { title: 'Lorem ipsum dolor sit amet' } }), /remplissage/],
      [plan({ op: 'insertSection', index: 0, section: faqSection }), /hero/],
      [plan({ op: 'insertSection', index: 2, section: { type: 'inconnu' } }), /opération 1/],
      [plan({ op: 'setTheme', style: 'artisan', palette: 'rose-fluo' }), /palette « rose-fluo » inconnue/],
      [plan({ op: 'updateSection', index: 1, set: { variant: 'diagonale' } }), /opération 1/],
    ];
    for (const [editPlan, expected] of cases) {
      const result = applyEditPlan(site, editPlan);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join(' | ')).toMatch(expected);
    }
  });

  it('change le style, le SEO et l’appel à l’action seulement sur demande explicite', () => {
    const site = base();
    const applied = applyOk(site, plan({ op: 'setTheme', style: 'premium' }, { op: 'setSeo', title: 'Boulangerie Martin — pains au levain' }, { op: 'setPrimaryCta', label: 'Nous appeler', href: 'tel:{{company.phone}}' }));
    expect(applied.site.theme.style).toBe('premium');
    expect(auditEdit(site, applied)).toEqual([]);
  });
});

describe('contrôles automatiques', () => {
  it('détecte une section non concernée qui a changé', () => {
    const site = base();
    const applied = applyOk(site, plan({ op: 'updateSection', index: typeIndex(site, 'hero'), set: { title: 'Un autre titre pour la boulangerie' } }));
    const tampered = structuredClone(applied);
    (tampered.site.pages[0].sections[typeIndex(site, 'about')] as { title: string }).title = 'Texte réécrit sans raison';
    expect(auditEdit(site, tampered).join(' ')).toMatch(/n’était pas concernée/);
  });

  it('détecte un changement global non demandé (style, SEO, appel à l’action, modules)', () => {
    const site = base();
    const applied = applyOk(site, plan({ op: 'updateSection', index: typeIndex(site, 'hero'), set: { title: 'Un autre titre pour la boulangerie' } }));
    const tampered = structuredClone(applied);
    tampered.site.theme = { style: 'dynamique' };
    tampered.site.seo.title = 'Autre titre';
    tampered.site.primaryCta = { label: 'Autre', href: '#contact' };
    const joined = auditEdit(site, tampered).join(' ');
    expect(joined).toMatch(/style du site a changé/);
    expect(joined).toMatch(/SEO/);
    expect(joined).toMatch(/appel à l’action principal a changé/);
  });

  it('refuse un téléphone ou un email écrits en dur et une adresse d’image inventée', () => {
    const site = base();
    const about = typeIndex(site, 'about');
    const phone = applyOk(site, plan({ op: 'updateSection', index: about, set: { paragraphs: ['Appelez-nous au 05 46 12 34 56 pour toute commande.'] } }));
    expect(auditEdit(site, phone).join(' ')).toMatch(/coordonnées écrites en dur/);
    const email = applyOk(site, plan({ op: 'updateSection', index: about, set: { paragraphs: ['Écrivez à boulanger@exemple.fr pour commander.'] } }));
    expect(auditEdit(site, email).join(' ')).toMatch(/coordonnées écrites en dur/);
    const token = applyOk(site, plan({ op: 'updateSection', index: about, set: { paragraphs: ['Appelez-nous au {{company.phone}} pour toute commande.'] } }));
    expect(auditEdit(site, token)).toEqual([]);
    const image = applyOk(site, plan({ op: 'updateSection', index: about, set: { image: { src: 'https://exemple.fr/photo.jpg', alt: 'Une photo inventée' } } }));
    expect(auditEdit(site, image).join(' ')).toMatch(/adresse inventée/);
    const query = applyOk(site, plan({ op: 'updateSection', index: about, set: { image: { query: 'baker kneading dough', alt: 'Le boulanger pétrit la pâte' } } }));
    expect(auditEdit(site, query)).toEqual([]);
  });

  it('refuse de vider la page d’un seul coup', () => {
    const site = base();
    const removable = site.pages[0].sections.map((section, index) => ({ section, index })).filter(({ section }) => section.type !== 'hero' && section.type !== 'footer').map(({ index }) => index);
    const operations = removable.slice(0, Math.ceil(site.pages[0].sections.length / 2)).reverse().map((index) => ({ op: 'removeSection' as const, index }));
    const result = applyEditPlan(site, plan(...operations));
    if (result.ok) expect(auditEdit(site, result.applied).join(' ')).toMatch(/trop de sections supprimées/);
  });
});

describe('photos', () => {
  it('masque les photos choisies au modèle puis les rend aux requêtes inchangées', () => {
    const site = base();
    const stripped = stripPhotos(site);
    expect(JSON.stringify(stripped)).not.toMatch(/"src":"https:\/\/images\.unsplash\.com/);
    const restored = restorePhotos(site, stripped);
    expect(restored).toEqual(site);
  });

  it('laisse sans photo une requête nouvelle', () => {
    const site = base();
    const stripped = stripPhotos(site);
    const about = typeIndex(site, 'about');
    (stripped.pages[0].sections[about] as { image?: unknown }).image = { query: 'baker kneading dough', alt: 'Le boulanger pétrit la pâte' };
    const restored = restorePhotos(site, stripped);
    expect((restored.pages[0].sections[about] as { image?: { src?: string } }).image?.src).toBeUndefined();
  });
});

describe('boucle de modification avec annulation et nouvel essai', () => {
  const provider = new MockProvider();
  const complete: Complete = (request) => provider.complete({ ...request, model: 'simulation' });
  const company = { name: 'Boulangerie Martin', activity: 'Boulangerie', city: 'La Rochelle' };

  it('annule un premier essai défectueux (texte de remplissage) puis applique le second', async () => {
    const site = base();
    const outcome = await editSiteDesign(complete, 'simulation', { request: 'Change le titre (version maladroite)', site, company });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.attempts).toBe(2);
    expect(outcome.rejections.join(' ')).toMatch(/remplissage/);
    expect((outcome.site.pages[0].sections[0] as { title: string }).title).toBe('Le pain du quartier, chaque matin');
  });

  it('ajoute une FAQ, retire les avis, change le style, sans rien toucher d’autre', async () => {
    const site = base();
    const faq = await editSiteDesign(complete, 'simulation', { request: 'Ajoute une FAQ', site, company });
    expect(faq.ok && faq.changed).toBe(true);
    if (!faq.ok) return;
    expect(faq.site.pages[0].sections.map((section) => section.type)).toContain('faq');
    const reviews = await editSiteDesign(complete, 'simulation', { request: 'Supprime les avis', site: faq.site, company });
    expect(reviews.ok && reviews.changed).toBe(true);
    if (!reviews.ok) return;
    expect(reviews.site.pages[0].sections.map((section) => section.type)).not.toContain('testimonials');
    const style = await editSiteDesign(complete, 'simulation', { request: 'Passe au style Élégant premium', site: reviews.site, company });
    expect(style.ok && style.changed && style.site.theme.style).toBe('premium');
  });

  it('renvoie une réponse sans modification quand la demande n’en est pas une', async () => {
    const outcome = await editSiteDesign(complete, 'simulation', { request: 'Merci beaucoup !', site: base(), company });
    expect(outcome.ok && outcome.changed).toBe(false);
  });

  it('abandonne après trois essais refusés sans rien modifier', async () => {
    const site = base();
    const always = async () => ({ content: JSON.stringify({ summary: 'ok', operations: [{ op: 'updateSection', index: 0, set: { title: 'Lorem ipsum dolor sit amet' } }] }) });
    const outcome = await editSiteDesign(always, 'simulation', { request: 'Change le titre', site, company });
    expect(outcome.ok).toBe(false);
    expect(outcome.attempts).toBe(3);
    expect(site).toEqual(base());
  });

  it('réessaie quand la réponse n’est pas du JSON', async () => {
    let calls = 0;
    const flaky = async () => ({ content: ++calls === 1 ? 'Voici ce que je propose : un nouveau titre.' : JSON.stringify({ summary: 'Rien à changer.', operations: [] }) });
    const outcome = await editSiteDesign(flaky, 'simulation', { request: 'Change le titre', site: base(), company });
    expect(outcome.ok).toBe(true);
    expect(outcome.attempts).toBe(2);
  });
});

describe('consignes du modèle', () => {
  it('interdit le HTML et les coordonnées en dur, et ne montre pas les photos choisies', () => {
    expect(editSystemPrompt).toMatch(/jamais de HTML/);
    expect(editSystemPrompt).toMatch(/\{\{company\.phone\}\}/);
    const message = editUserMessage({ request: 'Ajoute une FAQ', site: base(), company: { name: 'Boulangerie Martin' } });
    expect(message).toContain('Ajoute une FAQ');
    expect(message).not.toMatch(/images\.unsplash\.com/);
    expect(message).toMatch(/0 : hero/);
  });
});
