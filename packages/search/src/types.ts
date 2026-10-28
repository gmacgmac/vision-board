// The search contract (tracker M7, the search-and-finding set): documents in, hits out. A caller
// turns its own records into `SearchDoc`s (the board's cards: packages/actions `boardSearchDocs`),
// builds an index once per change, and asks it on every keystroke. Pure, no dependencies.

/** One searchable part of a document: its name (what the caller shows as "which part matched"),
 * its text as the person reads it, and its weight (a match here counts this many times). */
export interface SearchField { name: string; text: string; weight: number }

/** One thing to find. `id` is the caller's; fields are kept in the order given. */
export interface SearchDoc { id: string; fields: SearchField[] }

/** A run of matched text, as offsets into the field's ORIGINAL text, end exclusive: accents and
 * case are kept, so `text.slice(start, end)` is what to highlight. */
export type Range = [start: number, end: number];

/** One field that matched: its name, its place in the document's `fields` (`field`), so two
 * fields of the same name (two notes) stay apart, and every matched run in it, in order, merged. */
export interface FieldHit { name: string; field: number; ranges: Range[] }

/** One document that matched every word of the query, with its score (higher is better) and
 * the fields that matched, in the document's field order. */
export interface SearchHit { id: string; score: number; fields: FieldHit[] }

/** A field as the index holds it: its normalised text, and for each normalised character the
 * original offsets it came from (`starts`, `ends`), and whether it is a letter or a digit; `heads`
 * is the first character of every word and `headAt` where each is, so a one-letter query (every
 * search's first keystroke) reads word starts only. */
export interface IndexedField {
  name: string; text: string; weight: number;
  norm: string; starts: Uint32Array; ends: Uint32Array; word: Uint8Array;
  heads: string; headAt: Uint32Array;
}

/** A document as the index holds it; `all` is every field's normalised text, joined by a
 * separator no word holds, for the quick test of whether a query word is anywhere in it. */
export interface IndexedDoc { id: string; fields: IndexedField[]; all: string }

/** Built once by `searchIndex`, read by every `search`. */
export interface SearchIndex { readonly docs: readonly IndexedDoc[] }

/** `limit`: at most this many hits, the best ones. */
export interface SearchOptions { limit?: number }
