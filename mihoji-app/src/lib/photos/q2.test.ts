import { describe, expect, it } from 'vitest';
import { RateWindow } from './rate-window';
import { assignSlots, pendingSlots } from './assign';
import { applyPhotoRules } from './rules';
import { coverage, rankForSlot } from './select';
import { parseVerdicts, thumbnail, type VerifySlot } from './verify';
import { samples } from '../site/samples';
import { siteSchema, type SiteDescription } from '../site/schema';
import type { PhotoCandidate } from './types';

const photo = (id: string, alt: string): PhotoCandidate => ({ src: `https://images.unsplash.com/${id}`, alt, description: '', tags: [], credit: { name: 'A', url: 'https://unsplash.com/@a' } });
const site = () => siteSchema.parse(structuredClone(samples.find((sample) => sample.id === 'coach')!.site)) as SiteDescription;

describe('choix de photos par emplacement', () => {
  it('compare toutes les formulations d’un emplacement et garde la photo qui couvre le mieux le sujet', () => {
    const pool = [photo('a', 'mountain landscape at sunset'), photo('b', 'plumber tightening a copper pipe with a wrench'), photo('c', 'a plumber at work in a bathroom')];
    const ranked = rankForSlot(pool, ['plumber fixing sink pipe', 'plumber tightening copper pipe wrench'], 3);
    expect(ranked[0].src).toBe('https://images.unsplash.com/b');
    expect(ranked.map((entry) => entry.src)).not.toContain('https://images.unsplash.com/a');
  });

  it('écarte une photo qui ne couvre pas la moitié des mots de la requête', () => {
    expect(coverage(photo('a', 'a plumber smiling'), 'plumber fixing sink pipe')).toBeLessThan(0.5);
    expect(rankForSlot([photo('a', 'a plumber smiling')], ['plumber fixing sink pipe'])).toEqual([]);
  });

  it('attribue les photos acceptées sans jamais en réutiliser une, et laisse vide un emplacement sans photo acceptable', () => {
    const s = site();
    const slots = pendingSlots(s);
    expect(slots.length).toBeGreaterThan(3);
    const shared = [photo('1', 'x'), photo('2', 'y')];
    const choices = slots.map((_, index) => (index === 0 ? [] : shared));
    const { site: out, used, missing } = assignSlots(s, choices);
    const srcs = pendingSlots(out);
    expect(missing.length).toBeGreaterThanOrEqual(slots.length - 2);
    expect(new Set(used.map((entry) => entry.src)).size).toBe(used.length);
    expect(srcs.length).toBe(slots.length - used.length);
  });
});

describe('contrôle visuel des photos', () => {
  const slots: VerifySlot[] = [{ id: 0, subject: 'plombier', candidates: [photo('a', 'x'), photo('b', 'y'), photo('c', 'z')] }, { id: 1, subject: 'cuisine', candidates: [photo('d', 'x')] }];

  it('lit la réponse du modèle léger : photos acceptées, de la meilleure à la moins bonne', () => {
    const verdicts = parseVerdicts('Voici : {"slots":[{"id":0,"accepted":["C","a"]},{"id":1,"accepted":[]}]}', slots);
    expect(verdicts).toEqual([{ id: 0, accepted: [2, 0] }, { id: 1, accepted: [] }]);
  });

  it('ignore les lettres inexistantes et traite un emplacement oublié comme « aucune photo acceptable »', () => {
    const verdicts = parseVerdicts('{"slots":[{"id":0,"accepted":["D","B"]}]}', slots);
    expect(verdicts).toEqual([{ id: 0, accepted: [1] }, { id: 1, accepted: [] }]);
  });

  it('renvoie null pour une réponse illisible (le classement par mots-clés fait alors foi)', () => {
    expect(parseVerdicts('désolé', slots)).toBeNull();
    expect(parseVerdicts('{"slots":"non"}', slots)).toBeNull();
  });

  it('demande des vignettes de 400 px (coût minimal)', () => {
    expect(thumbnail('https://images.unsplash.com/photo-1')).toContain('w=400');
  });
});

describe('règles d’affichage des photos', () => {
  it('masque une galerie qui n’a pas au moins 3 bonnes photos, jamais vide', () => {
    const s = site();
    const gallery = s.pages[0].sections.find((section) => section.type === 'gallery');
    if (gallery?.type !== 'gallery') throw new Error('galerie attendue');
    gallery.images.forEach((entry, index) => { entry.image.src = index < 2 ? `https://images.unsplash.com/ok${index}` : undefined; });
    const { site: out, hiddenGalleries } = applyPhotoRules(s);
    expect(hiddenGalleries).toBe(1);
    expect(out.pages[0].sections.some((section) => section.type === 'gallery')).toBe(false);
  });

  it('garde une galerie de 3 bonnes photos et retire les cadres sans photo', () => {
    const s = site();
    const gallery = s.pages[0].sections.find((section) => section.type === 'gallery');
    if (gallery?.type !== 'gallery') throw new Error('galerie attendue');
    gallery.images.forEach((entry, index) => { entry.image.src = index < 3 ? `https://images.unsplash.com/ok${index}` : undefined; });
    const { site: out, hiddenGalleries } = applyPhotoRules(s);
    const kept = out.pages[0].sections.find((section) => section.type === 'gallery');
    expect(hiddenGalleries).toBe(0);
    expect(kept?.type === 'gallery' && kept.images.length).toBe(3);
  });
});


describe('attente du quota des fournisseurs (mode patient)', () => {
  it('laisse passer jusqu’à la limite puis attend la fin de la fenêtre glissante', async () => {
    const window = new RateWindow(3_600_000);
    let clock = 0;
    const waits: number[] = [];
    const wait = async (ms: number) => { waits.push(ms); clock += ms; };
    for (let i = 0; i < 3; i += 1) await window.take(3, () => clock, wait);
    expect(waits).toEqual([]);
    await window.take(3, () => clock, wait);
    expect(waits).toEqual([3_601_000]);
  });
  it('tient compte des appels déjà faits par un autre processus', async () => {
    const window = new RateWindow(60_000);
    window.reset(2, 0);
    let clock = 0;
    const waits: number[] = [];
    await window.take(2, () => clock, async (ms) => { waits.push(ms); clock += ms; });
    expect(waits).toEqual([61_000]);
  });
});

import { isPixabayUrl, toCandidate as pixabayCandidate } from './pixabay';
import { media } from '../site/html';

describe('Pixabay', () => {
  const hit = { id: 4242, pageURL: 'https://pixabay.com/photos/x-4242/', tags: 'baker, bread, bakery', webformatURL: 'https://pixabay.com/get/a_640.jpg', largeImageURL: 'https://pixabay.com/get/a_1280.jpg', user: 'Jane', user_id: 7 };
  it('transforme un résultat en candidate avec ses mots-clés, un crédit et un aperçu', () => {
    const candidate = pixabayCandidate(hit);
    expect(candidate).toMatchObject({ src: 'https://pixabay.com/get/a_1280.jpg', tags: ['baker', 'bread', 'bakery'], previewUrl: 'https://pixabay.com/get/a_640.jpg', sourceId: '4242' });
    expect(candidate.credit).toEqual({ name: 'Jane', url: 'https://pixabay.com/users/Jane-7/' });
  });
  it('reconnaît les adresses Pixabay (à héberger) et pas les autres', () => {
    expect(isPixabayUrl('https://pixabay.com/get/a.jpg')).toBe(true);
    expect(isPixabayUrl('https://cdn.pixabay.com/photo/a.jpg')).toBe(true);
    expect(isPixabayUrl('/api/hosted-photos/abc')).toBe(false);
    expect(isPixabayUrl('https://images.unsplash.com/a')).toBe(false);
  });
  it('affiche une photo hébergée avec le crédit du photographe et un lien vers Pixabay, jamais vers Unsplash', () => {
    const html = media({ src: '/api/hosted-photos/11111111-1111-1111-1111-111111111111', alt: 'Pain', credit: { name: 'Jane', url: 'https://pixabay.com/users/Jane-7/' } });
    expect(html).toContain('src="/api/hosted-photos/');
    expect(html).toContain('>Pixabay</a>');
    expect(html).not.toContain('Unsplash');
  });
});
