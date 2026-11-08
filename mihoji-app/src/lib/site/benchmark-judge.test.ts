import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { cropToSameHeight, judgePair, judgeSite } from './benchmark-judge';
import { JUDGE_COST_LIMIT_EUR, JUDGE_MODEL, GENERATOR_MODEL, pairSystemPrompt, pairUserMessage } from './benchmark-rubric';

const jpeg = (width: number, height: number) => sharp({ create: { width, height, channels: 3, background: '#cccccc' } }).jpeg().toBuffer();
// Réponse du modèle : un appel d'outil (objet) ou, pour simuler une panne, du texte sans appel d'outil.
const answer = (value: string | Record<string, unknown>, input = 1000, output = 500) => ({ content: [typeof value === 'string' ? { type: 'text', text: value } : { type: 'tool_use', id: 't', name: 'x', input: value }], usage: { input_tokens: input, output_tokens: output } });
const fake = (replies: ReturnType<typeof answer>[], seen: { bodies: Record<string, unknown>[] } = { bodies: [] }) => ({ messages: { create: async (body: Record<string, unknown>) => { seen.bodies.push(body); return replies.shift() ?? answer('rien'); } } }) as unknown as Anthropic;
const pairJson = ({ texte: { verdict: 'A', raison: 'r' }, distinctif: { verdict: 'egal', raison: 'r' }, hierarchie: { verdict: 'B', raison: 'r' }, photos: { verdict: 'A', raison: 'r' }, credibilite: { verdict: 'B', raison: 'r' } }) as Record<string, unknown>;
const absoluteJson = (Object.fromEntries(['texte', 'distinctif', 'hierarchie', 'photos', 'credibilite'].map((key) => [key, { observation: 'o', note: 3, raison: 'r' }]))) as Record<string, unknown>;

describe('choix du modèle juge', () => {
  it('est différent du modèle générateur et son coût par site reste sous le plafond', () => {
    expect(JUDGE_MODEL).not.toBe(GENERATOR_MODEL);
    expect(JUDGE_COST_LIMIT_EUR).toBe(0.05);
  });
});

describe('recadrage des captures', () => {
  it('ramène les deux captures à la hauteur de la plus petite', async () => {
    const [a, b] = await cropToSameHeight(await jpeg(300, 900), await jpeg(300, 600));
    expect((await sharp(a).metadata()).height).toBe(600);
    expect((await sharp(b).metadata()).height).toBe(600);
  });
});

describe('juge de paires', () => {
  const input = async () => ({ request: 'Un site', trade: 'plombier', company: 'X', a: { desktopJpeg: await jpeg(300, 800), mobileJpeg: await jpeg(100, 900) }, b: { desktopJpeg: await jpeg(300, 700), mobileJpeg: await jpeg(100, 600) } });
  it('envoie quatre images dans l’ordre A ordinateur, A mobile, B ordinateur, B mobile, sans rien dire de l’ancienneté', async () => {
    const seen = { bodies: [] as Record<string, unknown>[] };
    const outcome = await judgePair(fake([answer(pairJson)], seen), await input());
    expect(outcome.verdicts?.photos.verdict).toBe('A');
    const content = (seen.bodies[0].messages as { content: { type: string; text?: string }[] }[])[0].content;
    expect(content.filter((block) => block.type === 'image')).toHaveLength(4);
    expect(content.at(-1)?.text).toBe(pairUserMessage({ request: 'Un site', trade: 'plombier', company: 'X' }));
    expect(`${pairSystemPrompt}${content.at(-1)?.text}`.toLowerCase()).not.toMatch(/ancienne? version|nouvelle version|version (1|2)\b|plus r[ée]cent|avant la correction|apr[èe]s la correction|\bold\b|\bnew\b/);
    expect(seen.bodies[0].model).toBe(JUDGE_MODEL);
  });
  it('refait un essai si la réponse n’est pas conforme, puis abandonne avec le coût des deux appels', async () => {
    const ok = await judgePair(fake([answer('pas du json'), answer(pairJson)]), await input());
    expect(ok.verdicts).toBeTruthy();
    const ko = await judgePair(fake([answer('non'), answer({ texte: { verdict: 'C', raison: 'r' } })]), await input());
    expect(ko.verdicts).toBeUndefined();
    expect(ko.error).toContain('non conforme');
    expect(ko.costEur).toBeGreaterThan(ok.costEur - 1);
  });
  it('un verdict inconnu est refusé (seulement A, B ou egal)', async () => {
    const bad = { ...pairJson, texte: { verdict: 'meilleur', raison: 'r' } };
    expect((await judgePair(fake([answer(bad), answer(bad)]), await input())).verdicts).toBeUndefined();
  });
});

describe('sortie structurée', () => {
  it('les deux juges passent par un appel d’outil (jamais de JSON écrit à la main)', async () => {
    expect(pairSystemPrompt).toContain('comparer_les_sites');
    const seen = { bodies: [] as Record<string, unknown>[] };
    await judgeSite(fake([answer(absoluteJson)], seen), { request: 'x', trade: 't', company: 'c', desktopJpeg: await jpeg(300, 800), mobileJpeg: await jpeg(100, 800) });
    await judgePair(fake([answer(pairJson)], seen), { request: 'x', trade: 't', company: 'c', a: { desktopJpeg: await jpeg(300, 800), mobileJpeg: await jpeg(100, 800) }, b: { desktopJpeg: await jpeg(300, 800), mobileJpeg: await jpeg(100, 800) } });
    expect((seen.bodies[0].tools as { name: string }[]).map((tool) => tool.name)).toEqual(['noter_le_site']);
    expect((seen.bodies[1].tools as { name: string }[]).map((tool) => tool.name)).toEqual(['comparer_les_sites']);
    expect(seen.bodies[0].tool_choice).toBeUndefined(); // Opus 5.5 refuse l'outil forcé
  });
});

describe('juge de notation v2', () => {
  it('accepte la sortie structurée (observation, note, raison) et calcule le coût', async () => {
    const outcome = await judgeSite(fake([answer(absoluteJson, 3000, 700)]), { request: 'x', trade: 't', company: 'c', desktopJpeg: await jpeg(300, 800), mobileJpeg: await jpeg(100, 800) });
    expect(outcome.scores?.hierarchie.observation).toBe('o');
    expect(outcome.mean).toBe(3);
    expect(outcome.costEur).toBeGreaterThan(0);
  });
  it('refuse une réponse sans observation', async () => {
    const without = Object.fromEntries(Object.entries(absoluteJson).map(([key, value]) => [key, { note: (value as { note: number }).note, raison: 'r' }]));
    const outcome = await judgeSite(fake([answer(without), answer(without)]), { request: 'x', trade: 't', company: 'c', desktopJpeg: await jpeg(300, 800), mobileJpeg: await jpeg(100, 800) });
    expect(outcome.scores).toBeUndefined();
  });
});
