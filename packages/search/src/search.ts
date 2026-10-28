// Build an index once, ask it on every keystroke. A query is words in any order; every word must
// be found somewhere in a document (AND), as a whole word, the start of one, or inside one (a
// one-letter word only at a word's start). Matching is plain substring search over normalised text:
// no pattern is ever built from what the person typed.
import type { IndexedDoc, IndexedField, Range, SearchDoc, SearchHit, SearchIndex, SearchOptions } from './types.ts';
import { normalise, queryWords } from './normalise.ts';

/** How well one place fits a word: the whole word, its start, or inside it. */
const WHOLE = 3;
const START = 2;
const INSIDE = 1;
/** Each further match of a word in the same field adds this much, at most `MORE_CAP` times: more
 * matched words outrank fewer, and never lift an inside match over a word start. */
const MORE = 0.25;
const MORE_CAP = 2;
/** A word's best field counts in full; each other field that holds it adds this share, so a title
 * match outranks the same word in the text, the container and a note together. */
const SPREAD = 0.2;
/** Fields are joined by a character no query word holds, so a word never matches across two. */
const JOIN = '\n';

/** The index of `docs`: each field normalised once, with its way back to the original text. */
export function searchIndex(docs: readonly SearchDoc[]): SearchIndex {
  return {
    docs: docs.map(({ id, fields }): IndexedDoc => {
      const indexed = fields.map((f): IndexedField => {
        const n = normalise(f.text);
        return { name: f.name, text: f.text, weight: f.weight, ...n, ...headsOf(n.norm, n.word) };
      });
      return { id, fields: indexed, all: indexed.map((f) => f.norm).join(JOIN) };
    }),
  };
}

/** The first character of every word in `norm`, and where each is. */
function headsOf(norm: string, word: Uint8Array): { heads: string; headAt: Uint32Array } {
  let heads = '';
  const at: number[] = [];
  for (let i = 0; i < norm.length; i++) {
    if (word[i] && (i === 0 || !word[i - 1])) { heads += norm[i]; at.push(i); }
  }
  return { heads, headAt: Uint32Array.from(at) };
}

/** How `term` fits at `at` in field `f`: WHOLE, START, INSIDE, or 0 where it does not count. A
 * one-letter word counts at a word's start only, and never as a whole word (the article "a"). */
function fit(f: IndexedField, at: number, length: number): number {
  const start = at === 0 || f.word[at - 1] === 0;
  if (length === 1) return start ? START : 0;
  if (!start) return INSIDE;
  return at + length === f.norm.length || f.word[at + length] === 0 ? WHOLE : START;
}

/** Field `f`'s value for `term` (0 when it is not there), adding each place it counts to `out`. */
function fieldValue(f: IndexedField, term: string, out: Range[]): number {
  let best = 0;
  let count = 0;
  const add = (at: number) => {
    const q = fit(f, at, term.length);
    if (q === 0) return;
    out.push([at, at + term.length]);
    best = Math.max(best, q);
    count++;
  };
  if (term.length === 1) for (let k = f.heads.indexOf(term); k >= 0; k = f.heads.indexOf(term, k + 1)) add(f.headAt[k]!);
  else for (let at = f.norm.indexOf(term); at >= 0; at = f.norm.indexOf(term, at + 1)) add(at);
  return best === 0 ? 0 : f.weight * (best + MORE * Math.min(count - 1, MORE_CAP));
}

/** Normalised ranges, sorted and merged, as offsets into the original text. */
function original(f: IndexedField, ranges: Range[]): Range[] {
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Range[] = [];
  for (const [s, e] of ranges) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  return merged.map(([s, e]) => [f.starts[s]!, f.ends[e - 1]!]);
}

/** Document `d` as a hit for `terms`, or null when a term is found nowhere in it. */
function hitOf(d: IndexedDoc, terms: string[]): SearchHit | null {
  for (const t of terms) if (!d.all.includes(t)) return null;
  const ranges: Range[][] = d.fields.map(() => []);
  let score = 0;
  for (const t of terms) {
    let best = 0;
    let sum = 0;
    for (let i = 0; i < d.fields.length; i++) {
      const v = fieldValue(d.fields[i]!, t, ranges[i]!);
      best = Math.max(best, v);
      sum += v;
    }
    if (best === 0) return null;
    score += best + SPREAD * (sum - best);
  }
  const fields = d.fields.flatMap((f, i) => (ranges[i]!.length ? [{ name: f.name, field: i, ranges: original(f, ranges[i]!) }] : []));
  return { id: d.id, score, fields };
}

/** The documents matching every word of `query`, best first; equal scores keep the documents'
 * order. A blank query, or one with no letters or digits, finds nothing. */
export function search(index: SearchIndex, query: string, opts: SearchOptions = {}): SearchHit[] {
  const terms = queryWords(query);
  if (terms.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const d of index.docs) {
    const hit = hitOf(d, terms);
    if (hit) hits.push(hit);
  }
  hits.sort((a, b) => b.score - a.score);
  return opts.limit === undefined ? hits : hits.slice(0, Math.max(0, opts.limit));
}
