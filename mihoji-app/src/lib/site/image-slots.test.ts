import { describe, expect, it } from 'vitest';
import { imageSlots } from '../photos/assign';
import { designSystemPrompt, sectionGuide } from './design-prompt';
import { samples } from './samples';
import { siteSchema } from './schema';

// Mission photos des prestations : ce que le modèle PEUT et DOIT demander (schéma et consigne), et ce qu'il en reste après validation.
describe('emplacements d’images demandés par le modèle', () => {
  const site = () => {
    const base = structuredClone(samples.find((sample) => JSON.stringify(sample.site).includes('"type":"services"'))!.site) as { pages: { sections: Record<string, unknown>[] }[] };
    const sections = base.pages[0].sections;
    const services = sections.find((section) => section.type === 'services') as { items: Record<string, unknown>[] };
    services.items = services.items.map((item, index) => ({ ...item, image: { query: `physiotherapist treating ${['knee', 'back', 'shoulder', 'neck', 'ankle', 'hip', 'wrist', 'elbow'][index % 8]} patient`, alt: `Soin : ${item.title}` } }));
    const about = sections.find((section) => section.type === 'about');
    if (about) about.image = { query: 'friendly physiotherapist portrait clinic', alt: 'Portrait de la kinésithérapeute dans son cabinet' };
    return siteSchema.parse(base);
  };
  it('le schéma garde une requête de photo sur chaque prestation et sur le portrait de la présentation', () => {
    const built = site();
    const queries = imageSlots(built).map((slot) => slot.query);
    const services = built.pages[0].sections.find((section) => section.type === 'services');
    if (services?.type !== 'services') throw new Error();
    for (const item of services.items) expect(item.image?.query, item.title).toBeTruthy();
    expect(queries).toContain('friendly physiotherapist portrait clinic');
  });
  it('la consigne demande une photo par prestation, un portrait pour les praticiens, et l’indique dans le guide des champs', () => {
    expect(sectionGuide).toMatch(/services[^\n]*image\? \{query, alt\}/);
    expect(designSystemPrompt).toContain('une photo par prestation');
    expect(designSystemPrompt).toContain('portrait de professionnel');
    expect(designSystemPrompt).toContain('jamais de galerie pour un praticien');
  });
});
