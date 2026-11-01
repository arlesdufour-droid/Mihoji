import { describe, expect, it } from 'vitest';
import { shadowCostEur } from '../ai/pricing';
import type { CompletionResult } from '../ai/providers/types';
import { structureIssues } from '../engine/html-analysis';
import { applyRestyle, createSiteDesign, extractJson, parseDesign, restyleSiteDesign, type Complete } from './design';
import { mockDesignJson, mockRestyleJson } from './design-mock';
import { designSystemPrompt, designUserMessage, restyleSystemPrompt } from './design-prompt';
import { displayModules, formatDays, formatDuration, formatPrice, modulesSchema, webhookEvents } from './modules';
import { renderSite } from './render';
import { catalogueModules, catalogueSite, samples } from './samples';
import { sectionTypes, sectionVariants, siteSchema, type SiteDescription } from './schema';
import { styles } from './themes';

const baseSite = () => siteSchema.parse(samples[0].site);

function withModules(site: SiteDescription, modules: SiteDescription['modules'], sections: SiteDescription['pages'][0]['sections']): SiteDescription {
  const copy = structuredClone(site);
  copy.modules = modules;
  copy.pages[0].sections.splice(copy.pages[0].sections.length - 1, 0, ...sections);
  return copy;
}

describe('prompt du modèle de design', () => {
  it('décrit chaque type de section et chacune de ses variantes', () => {
    for (const type of sectionTypes) {
      expect(designSystemPrompt, type).toContain(`- ${type} (variant`);
      for (const variant of sectionVariants[type]) expect(designSystemPrompt, `${type}/${variant}`).toContain(`"${variant}"`);
    }
  });

  it('décrit chaque module fonctionnel, y compris widgets et webhooks', () => {
    for (const key of [...displayModules, 'widgets', 'webhooks']) expect(designSystemPrompt, key).toContain(`- ${key}`);
    for (const event of webhookEvents) expect(designSystemPrompt).toContain(event);
    for (const widget of ['google-maps', 'google-reviews', 'calendly', 'whatsapp', 'instagram']) expect(designSystemPrompt).toContain(widget);
  });

  it('propose les 4 styles et toutes leurs palettes, à la création comme au changement de style', () => {
    for (const style of styles) {
      for (const prompt of [designSystemPrompt, restyleSystemPrompt]) {
        expect(prompt).toContain(`"${style.id}"`);
        for (const palette of style.palettes) expect(prompt).toContain(`"${palette.id}"`);
      }
    }
  });

  it('impose des textes propres au métier, sans faux avis ni données entreprise inventées', () => {
    expect(designSystemPrompt).toContain('Aucune erreur de catégorie');
    expect(designSystemPrompt).toContain('N\'invente pas d\'avis clients');
    expect(designSystemPrompt).toContain('{{company.phone}}');
    expect(designSystemPrompt).toContain('EN ANGLAIS');
  });

  it('place la demande et l’entreprise dans le message utilisateur (prompt système stable, mis en cache)', () => {
    const message = designUserMessage({ request: 'Site pour ma boulangerie', company: { name: 'Boulangerie Brion', city: 'La Rochelle', hasPhone: false }, trade: 'Boulanger' });
    expect(message).toContain('« Site pour ma boulangerie »');
    expect(message).toContain('Boulangerie Brion');
    expect(message).toContain('Métier : Boulanger');
    expect(message).toContain('non renseigné');
    expect(designSystemPrompt).not.toContain('Boulangerie Brion');
  });
});

describe('modules fonctionnels', () => {
  it('valide le jeu complet de modules d’exemple', () => {
    expect(modulesSchema.safeParse(catalogueModules).success).toBe(true);
  });

  it('exige une section pour chaque module affichable, et un module pour chaque section', () => {
    const site = baseSite();
    expect(siteSchema.safeParse(withModules(site, { quote: catalogueModules.quote }, [])).success).toBe(false);
    expect(siteSchema.safeParse(withModules(site, undefined, [{ type: 'module', variant: 'panel', module: 'booking', title: 'Réservez' }])).success).toBe(false);
    expect(siteSchema.safeParse(withModules(site, { quote: catalogueModules.quote }, [{ type: 'module', variant: 'split', module: 'quote', title: 'Votre devis' }])).success).toBe(true);
    // Widgets et webhooks n'ont pas de section.
    expect(siteSchema.safeParse(withModules(site, { widgets: [{ type: 'whatsapp' }], webhooks: { events: ['contact.created'] } }, [])).success).toBe(true);
  });

  it('vérifie la cohérence des modules (acompte, retrait, widgets uniques)', () => {
    expect(modulesSchema.safeParse({ booking: { ...catalogueModules.booking, payment: 'deposit' } }).success).toBe(false);
    expect(modulesSchema.safeParse({ booking: { ...catalogueModules.booking, payment: 'deposit', depositPercent: undefined }, payment: catalogueModules.payment }).success).toBe(false);
    expect(modulesSchema.safeParse({ shop: { ...catalogueModules.shop, pickup: undefined } }).success).toBe(false);
    expect(modulesSchema.safeParse({ shop: { ...catalogueModules.shop, mode: 'delivery', pickup: undefined } }).success).toBe(true);
    expect(modulesSchema.safeParse({ widgets: [{ type: 'whatsapp' }, { type: 'whatsapp' }] }).success).toBe(false);
    expect(modulesSchema.safeParse({ booking: { ...catalogueModules.booking, schedule: { days: ['lundi'], start: '18:00', end: '09:00' } }, payment: catalogueModules.payment }).success).toBe(false);
  });

  it('affiche le contenu des modules, et des boutons désactivés « Bientôt disponible » pour ce qui n’est pas encore actif', () => {
    const html = renderSite(catalogueSite('artisan', undefined, 'module')).files['index.html'];
    expect(structureIssues(html)).toBe(0);
    expect(html).toContain('Diagnostic chaudière');
    expect(html).toContain('Acompte de 30 % à la réservation.');
    expect(html).toContain('du lundi au vendredi, 8 h – 18 h');
    expect(html).toContain('Mitigeur thermostatique');
    expect(html).toContain('Bientôt disponible');
    expect(html).toContain('id="reservation"');
    expect(html).toContain('id="commande"');
    // Aucun bouton actif sans action : soit l'envoi d'un formulaire, soit un bouton désactivé.
    for (const button of html.match(/<button\b[^>]*>/g) ?? []) expect(button, button).toMatch(/type="submit"|disabled/);
  });

  it('formate prix, durées et jours en français', () => {
    expect(formatPrice(55)).toBe('55 €');
    expect(formatPrice(4.2)).toBe('4,20 €');
    expect(formatPrice(1290)).toBe('1 290 €');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(90)).toBe('1 h 30');
    expect(formatDays(['mardi', 'lundi', 'mercredi'])).toBe('du lundi au mercredi');
    expect(formatDays(['lundi', 'jeudi'])).toBe('lundi et jeudi');
    expect(formatDays(['samedi'])).toBe('le samedi');
  });
});

describe('lecture de la réponse du modèle', () => {
  it('extrait le JSON même entouré d’un bloc de code', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Voici : {"a":{"b":2}}')).toEqual({ a: { b: 2 } });
    expect(() => extractJson('pas de JSON')).toThrow();
  });

  it('valide une description correcte et explique précisément les erreurs', () => {
    expect(parseDesign(JSON.stringify(samples[0].site)).ok).toBe(true);
    const broken = structuredClone(samples[0].site) as { pages: { sections: { type: string; title?: string }[] }[] };
    broken.pages[0].sections[1].title = '';
    const result = parseDesign(JSON.stringify(broken));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toContain('pages[0].sections[1].title');
    expect(parseDesign('{"version":1').ok).toBe(false);
  });
});

function fakeComplete(responses: Partial<CompletionResult>[]): { complete: Complete; calls: number[] } {
  const calls: number[] = [];
  let index = 0;
  return {
    calls,
    complete: async (request) => {
      calls.push(request.messages.length);
      const response = responses[Math.min(index, responses.length - 1)];
      index += 1;
      return { content: '', promptTokens: 4000, completionTokens: 5000, model: 'claude-sonnet-5-5', ...response };
    },
  };
}

describe('génération d’un site', () => {
  const input = { request: 'Site pour ma boulangerie avec click & collect', company: { name: 'Boulangerie Brion' } };

  it('renvoie l’erreur au modèle et recommence jusqu’à obtenir une description valide', async () => {
    const { complete, calls } = fakeComplete([{ content: '{"version":1,"pages":[]}' }, { content: JSON.stringify(samples[0].site) }]);
    const result = await createSiteDesign(complete, 'claude-sonnet-5-5', input);
    expect(result.ok).toBe(true);
    expect(result.usage.attempts).toBe(2);
    expect(calls).toEqual([2, 4]);
    expect(result.usage.costEur).toBeCloseTo(2 * shadowCostEur('claude-sonnet-5-5', { promptTokens: 4000, completionTokens: 5000 }), 6);
  });

  it('abandonne après 3 essais, sans jamais renvoyer de site invalide', async () => {
    const { complete } = fakeComplete([{ content: 'désolé' }]);
    const result = await createSiteDesign(complete, 'claude-sonnet-5-5', input);
    expect(result.ok).toBe(false);
    expect(result.usage.attempts).toBe(3);
  });

  it('refuse une réponse coupée par la limite de longueur', async () => {
    const { complete } = fakeComplete([{ content: JSON.stringify(samples[0].site), truncated: true }, { content: JSON.stringify(samples[0].site) }]);
    const result = await createSiteDesign(complete, 'claude-sonnet-5-5', input);
    expect(result.ok && result.usage.attempts).toBe(2);
  });

  it('respecte le style imposé par le client', async () => {
    const { complete } = fakeComplete([{ content: JSON.stringify(samples[0].site) }]);
    const result = await createSiteDesign(complete, 'claude-sonnet-5-5', { ...input, style: 'premium' });
    expect(result.ok && result.value.theme.style).toBe('premium');
  });

  it('ne compte aucun coût pour une réponse simulée', async () => {
    const { complete } = fakeComplete([{ content: JSON.stringify(samples[0].site), mock: true }]);
    expect((await createSiteDesign(complete, 'simulation', input)).usage.costEur).toBe(0);
  });
});

describe('changement de style', () => {
  it('change le thème et les variantes demandées sans toucher aux textes ni aux sections', () => {
    const site = baseSite();
    const next = applyRestyle(site, { theme: { style: 'premium', palette: 'noir-or' }, variants: [{ index: 1, variant: sectionVariants[site.pages[0].sections[1].type][0] }, { index: 2, variant: 'inexistante' }, { index: 99, variant: 'grid' }] });
    expect(next.theme).toEqual({ style: 'premium', palette: 'noir-or' });
    const strip = (value: SiteDescription) => value.pages[0].sections.map(({ variant, ...rest }) => { void variant; return rest; });
    expect(strip(next)).toEqual(strip(site));
    expect(next.pages[0].sections[2].variant).toBe(site.pages[0].sections[2].variant);
    expect(next.modules).toEqual(site.modules);
  });

  it('ignore une palette qui n’appartient pas au style choisi', () => {
    expect(applyRestyle(baseSite(), { theme: { style: 'moderne', palette: 'noir-or' } }).theme).toEqual({ style: 'moderne', palette: undefined });
  });

  it('passe par le modèle de design et recommence si la réponse est illisible', async () => {
    const { complete } = fakeComplete([{ content: 'non' }, { content: '{"theme":{"style":"dynamique","palette":"corail"},"summary":"Style dynamique en corail."}', promptTokens: 800, completionTokens: 60 }]);
    const result = await restyleSiteDesign(complete, 'claude-sonnet-5-5', baseSite(), 'plus coloré');
    expect(result.ok && result.value.theme).toEqual({ style: 'dynamique', palette: 'corail' });
    expect(result.ok && result.summary).toBe('Style dynamique en corail.');
    expect(result.usage.attempts).toBe(2);
  });
});

describe('coût des générations', () => {
  it('calcule le coût réel en euros selon le modèle et le cache', () => {
    expect(shadowCostEur('claude-sonnet-5-5', { promptTokens: 10_000, completionTokens: 6_000 })).toBeCloseTo((0.02 + 0.06) * 0.87, 6);
    expect(shadowCostEur('claude-sonnet-5-5', { cacheReadTokens: 10_000 })).toBeCloseTo(0.002 * 0.87, 6);
    expect(shadowCostEur('modèle-inconnu', { promptTokens: 1_000_000 })).toBeGreaterThan(shadowCostEur('claude-sonnet-5-5', { promptTokens: 1_000_000 }));
  });
});

describe('simulation du modèle de design (développement sans clé)', () => {
  const cases: [string, string[]][] = [
    ['Ma boulangerie, avec commande en click & collect', ['shop']],
    ['Coach sportif : prise de rendez-vous et paiement en ligne', ['booking', 'payment']],
    ['Plombier, je veux recevoir des demandes de devis', ['quote']],
  ];
  it.each(cases)('« %s » donne un site valide avec ses modules', (request, modules) => {
    const site = siteSchema.parse(JSON.parse(mockDesignJson(designUserMessage({ request, company: { name: 'Test' } }))));
    for (const key of modules) expect(site.modules?.[key as 'shop'], key).toBeDefined();
    expect(site.primaryCta.href).toMatch(/^#(commande|reservation|devis)$/);
  });

  it('simule un changement de style', () => {
    expect(JSON.parse(mockRestyleJson('Demande : « plus élégant »\nStyle actuel : "artisan".')).theme.style).toBe('premium');
  });
});
