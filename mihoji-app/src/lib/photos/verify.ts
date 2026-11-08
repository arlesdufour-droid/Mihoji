import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { shadowCostEur } from '../ai/pricing';
import type { PhotoCandidate } from './types';

// Vérification visuelle des photos par un modèle léger (Haiku) : pour chaque emplacement, parmi les 3 meilleures candidates,
// lesquelles illustrent vraiment le sujet ? Une seule requête par site, vignettes de 400 px : de l'ordre de 0,001 € par site.
// Une photo que le modèle écarte n'est JAMAIS utilisée : l'emplacement garde alors un visuel graphique aux couleurs du thème.

export const VERIFY_MODEL = process.env.AI_MODEL_PHOTOS || 'claude-haiku-5-5';
// Plafond de coût d'une vérification (euros) : au-delà, on s'arrête et les emplacements restants gardent le classement par mots-clés.
export const VERIFY_BUDGET_EUR = 0.01;

export type VerifySlot = { id: number; subject: string; candidates: PhotoCandidate[] };
export type Verdict = { id: number; accepted: number[] };

const LETTERS = ['A', 'B', 'C'];

export function thumbnail(src: string): string {
  try {
    const url = new URL(src);
    url.searchParams.set('w', '400');
    url.searchParams.set('q', '60');
    url.searchParams.set('fm', 'jpg');
    url.searchParams.set('fit', 'crop');
    return url.href;
  } catch {
    return src;
  }
}

// Type réel d'une image d'après ses premiers octets : certains serveurs annoncent « image/png » pour un fichier JPEG, ce que l'API refuse.
export function sniffImageType(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length > 11 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

// Photos Pixabay : on télécharge nous-mêmes l'aperçu (jamais d'adresse Pixabay transmise à un tiers ni affichée) et on l'envoie en base64.
async function imageBlock(candidate: PhotoCandidate): Promise<Anthropic.ContentBlockParam> {
  if (!candidate.previewUrl) return { type: 'image', source: { type: 'url', url: thumbnail(candidate.src) } };
  try {
    const response = await fetch(candidate.previewUrl, { signal: AbortSignal.timeout(15_000) });
    const type = response.headers.get('content-type')?.split(';')[0] ?? '';
    if (!response.ok || !/^image\/(jpeg|png|webp)$/.test(type)) throw new Error(`preview_${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const mediaType = sniffImageType(bytes) ?? (type as 'image/jpeg' | 'image/png' | 'image/webp');
    return { type: 'image', source: { type: 'base64', media_type: mediaType, data: bytes.toString('base64') } };
  } catch {
    return { type: 'text', text: '(image indisponible : refuse cette photo)' };
  }
}

export const legacyVerifySystemPrompt = `Tu contrôles les photos d'un site web d'entreprise. Pour chaque emplacement, on te donne le sujet attendu et jusqu'à 3 photos candidates (A, B, C).
Accepte une photo seulement si elle montre clairement le sujet attendu, dans un contexte professionnel crédible, sans texte lisible, logo, drapeau, filigrane ni cadrage étrange, et sans visage grimaçant.
Refuse une photo hors sujet, d'un autre métier, trop abstraite, sombre ou floue.
Réponds UNIQUEMENT par du JSON : {"slots":[{"id":0,"accepted":["B","A"]}]} — "accepted" liste les photos acceptables de la meilleure à la moins bonne, vide si aucune ne convient.`;

// Consigne actuelle (lot 7) : le contrôle visuel écarte les photos franchement mauvaises, pas celles qui sont seulement imparfaites.
export const verifySystemPrompt = `Tu contrôles les photos d'un site web d'entreprise. Pour chaque emplacement, on te donne le sujet attendu et jusqu'à 3 photos candidates (A, B, C).
Accepte une photo qui illustre raisonnablement le sujet : le bon métier, le bon lieu, le bon geste, le bon produit ou un détail qui l'évoque clairement (un outil, une matière, une ambiance de travail). Le sujet exact n'a pas besoin d'être au premier plan, ni la scène d'être parfaite ou posée en studio. Une photo plutôt sombre, naturelle ou de reportage est acceptable si on comprend ce qu'elle montre.
Le métier doit être le bon : un outil ou une scène d'un autre corps de métier (moteur de voiture pour un plombier, cuisine pour un fleuriste, poignée de main générique sans lien avec le cabinet ou l'activité) est refusé.
Refuse uniquement : une photo d'un autre métier ou sans rapport avec le sujet, un texte lisible, un logo ou une marque visible, un drapeau, un filigrane, un visage grimaçant, une image très floue ou presque noire, une illustration ou un dessin quand une photo est attendue, ou une personne nommée ou reconnaissable (célébrité).
En cas de doute entre accepter et refuser, accepte. Classe les photos acceptées de la meilleure à la moins bonne.
Réponds UNIQUEMENT par du JSON : {"slots":[{"id":0,"accepted":["B","A"]}]} — "accepted" liste les photos acceptables de la meilleure à la moins bonne, vide si aucune ne convient.`;

export const verifySchema = z.object({ slots: z.array(z.object({ id: z.number().int(), accepted: z.array(z.string()).max(3) })) });

export function parseVerdicts(text: string, slots: VerifySlot[]): Verdict[] | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let raw: unknown;
  try { raw = JSON.parse(text.slice(start, end + 1)); } catch { return null; }
  const parsed = verifySchema.safeParse(raw);
  if (!parsed.success) return null;
  return slots.map((slot) => {
    const found = parsed.data.slots.find((entry) => entry.id === slot.id);
    const accepted = (found?.accepted ?? []).map((letter) => LETTERS.indexOf(letter.trim().toUpperCase())).filter((index) => index >= 0 && index < slot.candidates.length);
    return { id: slot.id, accepted: [...new Set(accepted)] };
  });
}

export type VerifyOutcome = { verdicts: Verdict[] | null; costEur: number };

export async function verifyPhotos(slots: VerifySlot[], options: { client?: Anthropic; signal?: AbortSignal; systemPrompt?: string } = {}): Promise<VerifyOutcome> {
  if (slots.length === 0) return { verdicts: [], costEur: 0 };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!options.client && !apiKey) return { verdicts: null, costEur: 0 };
  const client = options.client ?? new Anthropic({ apiKey, maxRetries: 1 });
  const content: Anthropic.ContentBlockParam[] = [];
  for (const slot of slots) {
    content.push({ type: 'text', text: `Emplacement ${slot.id} — sujet attendu : ${slot.subject}` });
    for (const [index, candidate] of slot.candidates.slice(0, 3).entries()) {
      content.push({ type: 'text', text: `Photo ${LETTERS[index]} :` }, await imageBlock(candidate));
    }
  }
  try {
    const message = await client.messages.create({ model: VERIFY_MODEL, max_tokens: 3000, system: options.systemPrompt ?? verifySystemPrompt, messages: [{ role: 'user', content }] }, { signal: options.signal });
    const text = message.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
    const costEur = shadowCostEur(VERIFY_MODEL, { promptTokens: message.usage.input_tokens, completionTokens: message.usage.output_tokens, cacheReadTokens: message.usage.cache_read_input_tokens ?? 0, cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0 });
    const verdicts = parseVerdicts(text, slots);
    if (!verdicts) console.warn('Photo verification: unreadable answer.', text.slice(0, 200));
    return { verdicts, costEur };
  } catch (error) {
    console.warn('Photo verification failed.', error instanceof Error ? error.message : error);
    return { verdicts: null, costEur: 0 };
  }
}
