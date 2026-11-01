import { describe, expect, it } from 'vitest';
import { sanitizeSimpleText } from './sanitize';

describe('sanitizeSimpleText', () => {
  it('conserve un résumé en français simple', () => {
    expect(sanitizeSimpleText('J’ai ajouté une section Horaires : du lundi au vendredi, de 8 h à 18 h.')).toBe('J’ai ajouté une section Horaires : du lundi au vendredi, de 8 h à 18 h.');
  });

  it('supprime les blocs de code et le code inline', () => {
    expect(sanitizeSimpleText('Voici :\n```html\n<section>Test</section>\n```\nBon codage !')).toBe('Voici :');
    expect(sanitizeSimpleText('J’ai modifié `index.html`.')).toBe('J’ai modifié .');
  });

  it('supprime les balises HTML et les noms de fichiers', () => {
    expect(sanitizeSimpleText('La balise <h1> est dans app/page.tsx.')).toBe('La balise est dans .');
  });

  it('supprime le CSS inline sans balise', () => {
    expect(sanitizeSimpleText('J’ai appliqué color: #1e3a8a; aux titres.')).toBe('J’ai appliqué aux titres.');
    expect(sanitizeSimpleText('h1 { color: blue; } est appliqué.')).toBe('est appliqué.');
  });

  it('supprime le Markdown technique mais garde le texte', () => {
    expect(sanitizeSimpleText('## Section **Témoignages**\n- premier avis\n- second avis')).toBe('Section Témoignages\npremier avis\nsecond avis');
  });

  it('ne mangle pas les deux-points français', () => {
    expect(sanitizeSimpleText('Horaires : 8 h - 18 h, fermé dimanche.')).toBe('Horaires : 8 h - 18 h, fermé dimanche.');
    expect(sanitizeSimpleText('Votre position : au centre du village.')).toBe('Votre position : au centre du village.');
  });

  it('renvoie null quand il ne reste rien', () => {
    expect(sanitizeSimpleText('```tsx\n<div className="x" />\n```')).toBeNull();
  });
});
