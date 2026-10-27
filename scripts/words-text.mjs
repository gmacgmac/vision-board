// What counts as a sentence a person or an agent reads (cortex-architecture, references/words.md
// § The test), as pure functions over text. words-scan.mjs finds the literals; this decides which
// of them are sentences. The rule is tuned here, in one place: two words separated by a space, a
// lone capitalised word, any text in a place people read (markup text; label, title, placeholder
// and alt attributes), and not CSS, markup, identifiers or log lines.
// A "flat" string has \u0001 where a ${…} or {…} substitution stood, so a rule never reads code.

export const SUB = '\u0001';

/** Attributes whose value a person or a screen reader reads. */
export const TEXT_ATTRS = ['aria-label', 'aria-description', 'aria-roledescription', 'aria-valuetext', 'title', 'placeholder', 'alt'];

/** Property names whose value is read, even when it is a single lower-case word. */
export const READ_PROPS = /^(?:label|title|placeholder|hint|caption|tooltip|ariaLabel)$/;

const LETTERS = /\p{L}{2,}/u;
const noEntities = (s) => s.replace(/&#?\w+;/g, ' ');
const noSubs = (s) => s.replaceAll(SUB, '_');

/** Does this text hold words (not only substitutions, symbols, a lone key letter or entities)? */
export const hasWords = (s) => LETTERS.test(noEntities(noSubs(s)));

/** A selector, a class list, a CSP value or an attribute pair rather than prose. */
export function isCssish(t) {
  if (/^(?:id|event|data|retry):/m.test(t)) return true; // a server-sent event's lines
  if (/(?:^|\s)(?:default|img|font|connect|script|style|frame)-src\b|^sandbox\s/.test(t)) return true; // a content security policy
  return t.split(/\s+/).some((tok) => /^(?:[.#]|\[|vb-|--|data-|aria-)/.test(tok) || tok.includes('=') || tok === '>');
}

const TAGS = 'a|b|i|u|p|g|li|ul|ol|em|kbd|div|span|code|text|path|rect|svg|use|marker|circle|button|label|input|textarea|select|option|section|header|footer|small|strong|h[1-6]|dialog|form|img|br|hr|pre|details|summary|title|tspan|line';

/** Markup: an HTML or SVG tag, so its text and text attributes are found one by one (htmlSegments). */
export const isHtml = (t) => new RegExp(`</?(?:${TAGS})(?:[\\s/>]|$)`).test(noSubs(t));

const CSS_WORDS = /\b(?:translate[XY]?|scale|rotate|matrix|calc|var|rgba?|px|rem|em|ms|deg|vh|vw)\b/g;

/** A whole literal that is a sentence by the project's rule. */
export function isSentence(t) {
  const s = noSubs(t).trim();
  if (!s || isCssish(s)) return false;
  if (/\p{L}{2,}[ \t]+\p{L}{2,}/u.test(s)) return true;
  if (/^\p{Lu}\p{Ll}{2,}[.!?…]?$/u.test(s)) return true;
  // A fragment glued to other text: ", new", "new ", " and ".
  if (/^[,;]\s*\(?\p{L}{3,}|^\s*\p{L}{3,}\s+$|^\p{L}{3,}\s+$/u.test(noSubs(t))) return true;
  return t.includes(SUB) && /\s/.test(t.trim()) && /\p{L}{3,}/u.test(s.replace(CSS_WORDS, ' '));
}

/** Text nodes and text attributes of a markup string, as [start, end) ranges of the flat string. */
export function htmlSegments(flat) {
  const out = [];
  const text = (a, b) => {
    const s = flat.slice(a, b);
    if (!hasWords(s)) return;
    const lead = s.length - s.trimStart().length;
    out.push([a + lead, b - (s.length - s.trimEnd().length)]);
  };
  const attr = new RegExp(`(?:^|\\s)(?:${TEXT_ATTRS.join('|')})=("([^"]*)"|'([^']*)')`, 'g');
  const attrs = (tag, at) => {
    for (const m of tag.matchAll(attr)) {
      const value = m[2] ?? m[3];
      if (hasWords(value)) out.push([at + m.index + m[0].length - value.length - 1, at + m.index + m[0].length - 1]);
    }
  };
  // The tag the string ends: a piece of markup can begin inside a tag (`title="x">`).
  const gt = flat.indexOf('>');
  const lt = flat.indexOf('<');
  let i = 0;
  if (gt !== -1 && (lt === -1 || gt < lt)) { attrs(flat.slice(0, gt + 1), 0); i = gt + 1; }
  let from = i;
  while (i < flat.length) {
    if (flat[i] !== '<' || !/[a-zA-Z!/]/.test(flat[i + 1] ?? '')) { i++; continue; }
    text(from, i);
    let j = i + 1;
    let quote = '';
    for (; j < flat.length; j++) {
      const c = flat[j];
      if (quote) { if (c === quote) quote = ''; } else if (c === '"' || c === "'") quote = c; else if (c === '>') break;
    }
    attrs(flat.slice(i, j + 1), i);
    i = j + 1;
    from = i;
  }
  text(from, flat.length);
  return out;
}

/** A property read as a sentence only when it says words: not an id (`a-${b}-hint`). */
export const readsAsWords = (s) => hasWords(s) && (/\s/.test(s.trim()) || /^\p{L}[\p{L}'’]*$/u.test(noSubs(s).trim()));

const ESCAPES = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' };

/** What a JS string or template's raw text says (its cooked value). */
export function cook(raw) {
  return raw.replace(/\\(?:u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|(\r?\n)|([\s\S]))/g,
    (_, cp, u, x, nl, c) => (cp ? String.fromCodePoint(parseInt(cp, 16)) : u || x ? String.fromCharCode(parseInt(u ?? x, 16)) : nl ? '' : ESCAPES[c] ?? c));
}
