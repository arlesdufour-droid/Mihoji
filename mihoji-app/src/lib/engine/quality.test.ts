import { describe, expect, it } from 'vitest';
import { contrastIssues, fixContrast, introducedContrastIssues } from './contrast';
import { blocksOf, parseHtml, repairMalformedTags, structureIssues } from './html-analysis';
import { classifyIntent, enforceQuality } from './quality';

const header = '<header class="bg-indigo-700 px-8 py-16 text-white"><p class="text-sm text-indigo-200">Boulangerie</p><h1 class="mt-4 text-4xl font-bold text-white">Brion</h1></header>';
const accueil = '<section><h2 class="text-2xl font-bold text-slate-900">Bienvenue</h2><p class="mt-3 text-slate-600">Découvrez nos pains.</p></section>';
const horaires = '<section data-mihoji="horaires" class="rounded-xl bg-slate-100 p-5"><h2 class="text-2xl font-bold text-slate-900">Horaires</h2><p class="mt-2">Du lundi au vendredi, de 8h à 18h.</p></section>';
const footer = '<footer class="px-8 py-6 text-sm text-slate-500"><span>Brion</span></footer>';
const site = `<div class="min-h-full bg-white text-slate-900">${header}<main class="space-y-8 p-8">${accueil}${horaires}</main>${footer}</div>`;

function run(before: string, after: string, prompt: string) {
  return enforceQuality(new Map([['index.html', before]]), new Map([['index.html', after]]), { prompt });
}

describe('analyse HTML', () => {
  it('détecte et répare une balise fermante tronquée', () => {
    const broken = horaires.replace('</h2><p', '</h2<p');
    expect(structureIssues(broken)).toBeGreaterThan(structureIssues(horaires));
    expect(repairMalformedTags(broken)).toBe(horaires);
    expect(structureIssues(repairMalformedTags(broken))).toBe(0);
  });

  it('découpe le site en blocs : bandeau, sections, pied de page', () => {
    const blocks = blocksOf(parseHtml(site).root).map((block) => block.tag);
    expect(blocks).toEqual(['header', 'section', 'section', 'footer']);
  });
});

describe('classifyIntent', () => {
  it('distingue style et contenu', () => {
    expect(classifyIntent('Change la couleur des titres en bleu foncé')).toBe('style');
    expect(classifyIntent('Mets le titre en gras')).toBe('style');
    expect(classifyIntent('Ajoute une section avec un fond bleu')).toBe('content');
    expect(classifyIntent('Modifie les horaires d’ouverture')).toBe('content');
  });
});

describe('contraste WCAG AA', () => {
  it('signale un titre bleu foncé sur un bandeau violet', () => {
    const bad = site.replace('text-4xl font-bold text-white', 'text-4xl font-bold text-blue-900');
    const issues = contrastIssues(bad);
    expect(issues.map((issue) => issue.text)).toEqual(['Brion']);
    expect(issues[0].ratio).toBeLessThan(3);
  });

  it('ne signale rien sur un site lisible', () => {
    expect(contrastIssues(site)).toEqual([]);
  });

  it('corrige automatiquement avec un texte clair', () => {
    const bad = site.replace('text-4xl font-bold text-white', 'text-4xl font-bold text-blue-900');
    const fixed = fixContrast(bad, contrastIssues(bad));
    expect(fixed.fixes).toEqual([{ text: 'Brion', tone: 'clair' }]);
    expect(contrastIssues(fixed.html)).toEqual([]);
    expect(fixed.html).toContain('text-4xl font-bold text-white');
  });

  it('corrige aussi une couleur inline et ajoute une classe quand il n’y en a pas', () => {
    const inline = '<div style="background:#1e3a8a"><p style="color:#1c398e">Texte</p></div>';
    expect(contrastIssues(fixContrast(inline, contrastIssues(inline)).html)).toEqual([]);
    const bare = '<div class="bg-slate-900"><p>Texte</p></div>';
    const fixed = fixContrast(bare, contrastIssues(bare));
    expect(fixed.html).toContain('<p class="text-white">');
  });

  it('tient compte de l’opacité du fond et du texte large', () => {
    const translucent = '<div class="bg-slate-900"><div class="bg-white/10"><p class="text-white">Lisible</p></div></div>';
    expect(contrastIssues(translucent)).toEqual([]);
    const large = '<div class="bg-white"><h2 class="text-2xl font-bold text-red-500">Grand</h2></div>';
    const small = '<div class="bg-white"><p class="text-red-500">Petit</p></div>';
    expect(contrastIssues(large)).toEqual([]);
    expect(contrastIssues(small)).toHaveLength(1);
  });

  it('ne retient que les problèmes apparus avec la modification', () => {
    const before = '<div class="bg-white"><p class="text-slate-300">Déjà pâle</p></div>';
    const after = `${before.slice(0, -6)}<p class="text-slate-200">Nouveau</p></div>`;
    expect(introducedContrastIssues(before, after).map((issue) => issue.text)).toEqual(['Nouveau']);
  });
});

describe('garde-fous de génération', () => {
  const blueHeadings = site.replaceAll('text-slate-900', 'text-blue-900').replace('text-4xl font-bold text-white', 'text-4xl font-bold text-blue-900');

  it('accepte « titres en bleu » et garde le titre du bandeau lisible', () => {
    const outcome = run(site, blueHeadings, 'Change la couleur des titres en bleu foncé');
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const html = outcome.files.get('index.html')!;
    expect(html).toContain('<h1 class="mt-4 text-4xl font-bold text-white">');
    expect(html).toContain('<h2 class="text-2xl font-bold text-blue-900">Horaires</h2>');
    expect(outcome.notes.join(' ')).toContain('lisible');
  });

  it('annule une demande de style qui colle le titre Horaires à son texte', () => {
    const broken = blueHeadings.replace('Horaires</h2><p', 'Horaires</h2<p');
    const outcome = run(site, broken, 'Change la couleur des titres en bleu foncé');
    expect(outcome.ok).toBe(false);
  });

  it('annule une demande de style qui supprime un attribut autre que class et style', () => {
    const stripped = blueHeadings.replace(' data-mihoji="horaires"', '');
    expect(run(site, stripped, 'Mets les titres en bleu').ok).toBe(false);
  });

  it('annule une demande de style qui change un texte', () => {
    const changed = blueHeadings.replace('Du lundi au vendredi', 'Tous les jours');
    const outcome = run(site, changed, 'Mets les titres en bleu');
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toContain('Horaires');
  });

  it('accepte l’ajout d’une section sans toucher aux autres', () => {
    const added = site.replace('</main>', '<section><h2 class="text-2xl font-bold text-slate-900">Témoignages</h2><p>Super pain !</p></section></main>');
    expect(run(site, added, 'Ajoute une section Témoignages avec 2 avis clients').ok).toBe(true);
  });

  it('refuse un ajout qui réécrit une autre section', () => {
    const rewritten = site.replace('Du lundi au vendredi, de 8h à 18h.', 'Tous les jours.').replace('</main>', '<section><h2>Témoignages</h2></section></main>');
    const outcome = run(site, rewritten, 'Ajoute une section Témoignages avec 2 avis clients');
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toContain('Horaires');
  });

  it('autorise la modification de la section visée', () => {
    const edited = site.replace('Du lundi au vendredi, de 8h à 18h.', 'Du mardi au samedi, de 7h à 19h.');
    expect(run(site, edited, 'Modifie les horaires d’ouverture').ok).toBe(true);
  });

  it('refuse un balisage cassé même pour une demande de contenu', () => {
    const broken = site.replace('</footer>', '</foot').replace('<h2 class="text-2xl font-bold text-slate-900">Bienvenue', '<h2 class="text-2xl font-bold text-slate-900">Bienvenue chez nous');
    expect(run(site, broken, 'Modifie le texte de bienvenue').ok).toBe(false);
  });
});
