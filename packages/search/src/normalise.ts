// Text as search compares it: decomposed (NFD), accents (combining marks) stripped, lower case, so
// "Résumé", "RESUME" and "résumé" all read "resume". Each normalised character keeps
// the original offsets it came from, so a match found in the normalised text is highlighted in the
// original one, accents and all. A word is a run of letters and digits; everything else splits.

const MARKS = /\p{M}/gu;
const WORD = /^[\p{L}\p{N}]$/u;

/** Normalised text, and per normalised character (UTF-16 unit): the original start and end offset
 * of the character it came from, and 1 when it is part of a word (a letter or a digit). */
export interface Normalised { norm: string; starts: Uint32Array; ends: Uint32Array; word: Uint8Array }

const isAsciiWord = (c: number): boolean => (c >= 48 && c <= 57) || (c >= 97 && c <= 122);

/** `text` normalised, with the way back to its original offsets. */
export function normalise(text: string): Normalised {
  let norm = '';
  const starts: number[] = [];
  const ends: number[] = [];
  const word: number[] = [];
  for (let i = 0; i < text.length;) {
    const code = text.codePointAt(i)!;
    const end = i + (code > 0xffff ? 2 : 1);
    if (code < 128) {
      const c = code >= 65 && code <= 90 ? code + 32 : code;
      norm += String.fromCharCode(c);
      starts.push(i); ends.push(end); word.push(isAsciiWord(c) ? 1 : 0);
    } else {
      const piece = text.slice(i, end).normalize('NFD').toLowerCase().replace(MARKS, '');
      // A combining mark on its own (a decomposed accent) belongs to the letter before it.
      if (piece === '' && ends.length > 0 && ends[ends.length - 1] === i) ends[ends.length - 1] = end;
      for (const ch of piece) {
        norm += ch;
        const w = WORD.test(ch) ? 1 : 0;
        for (let k = 0; k < ch.length; k++) { starts.push(i); ends.push(end); word.push(w); }
      }
    }
    i = end;
  }
  return { norm, starts: Uint32Array.from(starts), ends: Uint32Array.from(ends), word: Uint8Array.from(word) };
}

/** The words of `query`, normalised, each once, in the order typed. */
export function queryWords(query: string): string[] {
  const { norm, word } = normalise(query);
  const out = new Set<string>();
  let from = -1;
  for (let i = 0; i <= norm.length; i++) {
    if (i < norm.length && word[i]) { if (from < 0) from = i; } else if (from >= 0) { out.add(norm.slice(from, i)); from = -1; }
  }
  return [...out];
}
