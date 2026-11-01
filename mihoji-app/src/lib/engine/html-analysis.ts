// Analyse HTML légère et tolérante : suffisante pour comparer des sections avant/après une modification
// et repérer un balisage cassé (ex. « </h2<p » qui collait un titre à son paragraphe).

export type El = {
  tag: string;
  attrs: Record<string, string>;
  children: (El | string)[];
  openStart: number;
  openEnd: number;
  end: number;
  parent: El | null;
};

export type ParseResult = { root: El; strayMarkup: number; unmatchedCloses: number; unclosed: number };

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW_TEXT = new Set(['script', 'style']);
const OPTIONAL_END = new Set(['p', 'li', 'dt', 'dd', 'td', 'th', 'tr', 'thead', 'tbody', 'tfoot', 'option']);
const SECTION_TAGS = new Set(['header', 'section', 'footer', 'nav', 'aside', 'article']);
const WRAPPER_TAGS = new Set(['div', 'main', 'body', 'html', 'form']);

const TAG_RE = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^<>"'])*)>/g;

export function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of source.matchAll(/([^\s=/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

export function parseHtml(html: string): ParseResult {
  const root: El = { tag: '#root', attrs: {}, children: [], openStart: 0, openEnd: 0, end: html.length, parent: null };
  const stack: El[] = [root];
  let strayMarkup = 0;
  let unmatchedCloses = 0;
  let unclosed = 0;
  let last = 0;

  const pushText = (from: number, to: number) => {
    if (to <= from) return;
    const text = html.slice(from, to);
    strayMarkup += (text.match(/</g) ?? []).length;
    if (text.trim()) stack[stack.length - 1].children.push(text);
  };

  const lowerHtml = html.toLowerCase();
  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_RE.exec(html))) {
    pushText(last, match.index);
    last = match.index + match[0].length;
    if (match[0].startsWith('<!--')) continue;
    const closing = match[1] === '/';
    const name = match[2].toLowerCase();
    const rest = match[3];
    if (closing) {
      let index = stack.length - 1;
      while (index > 0 && stack[index].tag !== name) index -= 1;
      if (index === 0) {
        unmatchedCloses += 1;
        continue;
      }
      while (stack.length - 1 > index) {
        const implicit = stack.pop()!;
        implicit.end = match.index;
        if (!OPTIONAL_END.has(implicit.tag)) unclosed += 1;
      }
      stack.pop()!.end = last;
      continue;
    }
    const element: El = { tag: name, attrs: parseAttrs(rest), children: [], openStart: match.index, openEnd: last, end: last, parent: stack[stack.length - 1] };
    stack[stack.length - 1].children.push(element);
    if (VOID.has(name) || /\/\s*$/.test(rest)) continue;
    if (RAW_TEXT.has(name)) {
      const closeStart = lowerHtml.indexOf(`</${name}`, last);
      const closeEnd = closeStart === -1 ? -1 : html.indexOf('>', closeStart);
      const end = closeEnd === -1 ? html.length : closeEnd + 1;
      element.end = end;
      TAG_RE.lastIndex = end;
      last = end;
      continue;
    }
    stack.push(element);
  }
  pushText(last, html.length);
  while (stack.length > 1) {
    const element = stack.pop()!;
    element.end = html.length;
    if (!OPTIONAL_END.has(element.tag)) unclosed += 1;
  }
  return { root, strayMarkup, unmatchedCloses, unclosed };
}

export function structureIssues(html: string): number {
  const parsed = parseHtml(html);
  return parsed.strayMarkup + parsed.unmatchedCloses + parsed.unclosed;
}

// Répare les balises fermantes tronquées (« </h2<p class="…"> » devient « </h2><p class="…"> »).
export function repairMalformedTags(html: string): string {
  return html.replace(/<\/([a-zA-Z][a-zA-Z0-9-]*)(?=<[a-zA-Z/])/g, '</$1>');
}

export function normalizeText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function collapse(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function textsOf(element: El): string[] {
  const texts: string[] = [];
  const visit = (node: El | string) => {
    if (typeof node === 'string') {
      const text = collapse(node);
      if (text) texts.push(text);
    } else {
      node.children.forEach(visit);
    }
  };
  visit(element);
  return texts;
}

export function directText(element: El): string {
  return collapse(element.children.filter((child): child is string => typeof child === 'string').join(' '));
}

// Signature du contenu : balises et textes, sans aucun attribut (classes, styles). Deux blocs qui ne diffèrent
// que par leur style ont la même signature ; un texte collé ou une balise supprimée la change.
export function contentSignature(element: El, options: { attributes?: boolean } = {}): string {
  const parts: string[] = [];
  // Avec `attributes`, les attributs autres que class et style (id, href, data-*…) font aussi partie de la signature.
  const attributesOf = (node: El) => Object.entries(node.attrs).filter(([name]) => name !== 'class' && name !== 'style').sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => `${name}=${JSON.stringify(value)}`).join(',');
  const visit = (node: El | string) => {
    if (typeof node === 'string') {
      const text = collapse(node);
      if (text) parts.push(JSON.stringify(text));
      return;
    }
    parts.push(options.attributes ? `<${node.tag}[${attributesOf(node)}]` : `<${node.tag}`);
    node.children.forEach(visit);
    parts.push('>');
  };
  visit(element);
  return parts.join(' ');
}

export function rawOf(html: string, element: El): string {
  return collapse(html.slice(element.openStart, element.end));
}

function containsSection(element: El): boolean {
  return element.children.some((child) => typeof child !== 'string' && (SECTION_TAGS.has(child.tag) || containsSection(child)));
}

// Blocs de premier niveau : sections, en-tête, pied de page, et éléments isolés directement dans <main>.
export function blocksOf(root: El): El[] {
  const blocks: El[] = [];
  const collect = (parent: El) => {
    for (const child of parent.children) {
      if (typeof child === 'string') continue;
      if (child.tag === 'script' || child.tag === 'style') continue;
      if (SECTION_TAGS.has(child.tag)) blocks.push(child);
      else if ((WRAPPER_TAGS.has(child.tag) && (containsSection(child) || child.tag === 'main' || child.tag === 'body' || child.tag === 'html'))) collect(child);
      else blocks.push(child);
    }
  };
  collect(root);
  return blocks;
}

const TAG_ALIASES: Record<string, string> = {
  header: 'entete en-tete bandeau haut banniere',
  footer: 'pied bas footer',
  nav: 'menu navigation',
};

export function blockLabel(block: El): string {
  const heading = findHeading(block);
  const text = heading ?? textsOf(block)[0] ?? block.tag;
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

function findHeading(element: El): string | null {
  for (const child of element.children) {
    if (typeof child === 'string') continue;
    if (/^h[1-6]$/.test(child.tag)) return directText(child) || textsOf(child)[0] || null;
    const nested = findHeading(child);
    if (nested) return nested;
  }
  return null;
}

// Texte normalisé servant à savoir si une demande « vise » un bloc (mots-clés, nom de balise, data-mihoji).
export function blockSearchText(block: El): string {
  return normalizeText([...textsOf(block), block.attrs['data-mihoji'] ?? '', TAG_ALIASES[block.tag] ?? ''].join(' '));
}
