// The search engine (tracker M7, PLAN § The maintainer's rulings): words in any order, part of a
// word, case and accents ignored, every word must match, best matches first, and which part
// matched with ranges into the original text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SearchDoc, SearchHit } from '../src/index.ts';
import { search, searchIndex } from '../src/index.ts';

/** A card-like document: a title (weight 3) and a body (weight 2), plus any extra fields. */
const doc = (id: string, title: string, body = '', ...more: [string, string, number][]): SearchDoc => ({
  id, fields: [{ name: 'title', text: title, weight: 3 }, { name: 'body', text: body, weight: 2 }, ...more.map(([name, text, weight]) => ({ name, text, weight }))],
});
const find = (docs: SearchDoc[], q: string, limit?: number): SearchHit[] => search(searchIndex(docs), q, limit === undefined ? {} : { limit });
const ids = (docs: SearchDoc[], q: string): string[] => find(docs, q).map((h) => h.id);
/** The text each range of the first hit's field `name` covers, in the original text. */
const marked = (d: SearchDoc, q: string, name = 'title'): string[] => {
  const hit = find([d], q)[0];
  assert.ok(hit, `no hit for "${q}"`);
  const f = hit.fields.find((x) => x.name === name)!;
  return f.ranges.map(([s, e]) => d.fields[f.field]!.text.slice(s, e));
};

test('words in any order: "pricing annual" finds "Annual pricing"', () => {
  assert.deepEqual(ids([doc('1', 'Annual pricing'), doc('2', 'Roadmap')], 'pricing annual'), ['1']);
});

test('part of a word: "pric" finds "Pricing"', () => {
  assert.deepEqual(ids([doc('1', 'Pricing'), doc('2', 'Roadmap')], 'pric'), ['1']);
});

test('case and accents are ignored: resume finds Résumé, CAFE finds café, either way round', () => {
  assert.deepEqual(ids([doc('1', 'Résumé'), doc('2', 'Resolve')], 'resume'), ['1']);
  assert.deepEqual(ids([doc('1', 'Le café'), doc('2', 'Cage')], 'CAFE'), ['1']);
  assert.deepEqual(ids([doc('1', 'Resume')], 'résumé'), ['1']);
  assert.deepEqual(ids([doc('1', 'Résumé')], 'resume'), ['1'], 'decomposed accents too');
});

test('every query word must match somewhere (AND), in any field', () => {
  const docs = [doc('1', 'Annual pricing'), doc('2', 'Monthly pricing'), doc('3', 'Annual', 'the pricing note')];
  assert.deepEqual(ids(docs, 'pricing annual').sort(), ['1', '3']);
  assert.deepEqual(ids(docs, 'pricing weekly'), []);
});

test('a title match outranks a text match', () => {
  assert.deepEqual(ids([doc('1', 'Roadmap', 'pricing'), doc('2', 'Pricing')], 'pricing'), ['2', '1']);
});

test('a word start outranks a match in the middle of a word', () => {
  assert.deepEqual(ids([doc('1', 'Repricing'), doc('2', 'Pricing')], 'pric'), ['2', '1']);
});

test('a whole word outranks the start of a longer one', () => {
  assert.deepEqual(ids([doc('1', 'Planning'), doc('2', 'Plan')], 'plan'), ['2', '1']);
});

test('more matched words outrank fewer', () => {
  assert.deepEqual(ids([doc('1', 'Price list'), doc('2', 'Price and pricing')], 'pric'), ['2', '1']);
  // Both words in the title beat one in the title and one in the text.
  assert.deepEqual(ids([doc('1', 'Annual report', 'pricing'), doc('2', 'Annual pricing')], 'annual pricing'), ['2', '1']);
});

test('repeating a word many times never lifts a middle match over a word start', () => {
  assert.deepEqual(ids([doc('1', 'repricing repricing repricing repricing'), doc('2', 'Pricing')], 'pric'), ['2', '1']);
});

test('equal scores keep the documents\' order', () => {
  assert.deepEqual(ids([doc('3', 'Pricing'), doc('1', 'Pricing'), doc('2', 'Pricing')], 'pricing'), ['3', '1', '2']);
});

test('ranges point at the original text, accents and case kept', () => {
  assert.deepEqual(marked(doc('1', 'Le Café Résumé'), 'resume cafe'), ['Café', 'Résumé']);
  assert.deepEqual(marked(doc('1', 'Le Café Résumé'), 'rés'), ['Rés']);
  assert.deepEqual(marked(doc('1', 'Résumé'), 'resume'), ['Résumé'], 'a decomposed accent stays with its letter');
  assert.deepEqual(marked(doc('1', 'Pricing, then repricing'), 'pric'), ['Pric', 'pric']);
});

test('ranges are in order and merged where two query words overlap', () => {
  const hit = find([doc('1', 'annual pricing')], 'pricing pri ann')[0]!;
  assert.deepEqual(hit.fields[0]!.ranges, [[0, 3], [7, 14]]);
});

test('ranges survive characters outside the basic plane', () => {
  assert.deepEqual(marked(doc('1', '🚀 Launch plan'), 'launch'), ['Launch']);
});

test('which part matched: every field that matched, in field order, with its place', () => {
  const d = doc('1', 'Pricing', 'Annual plan', ['note', 'Too low?', 1], ['note', 'Check the pricing', 1]);
  const hit = find([d], 'pricing')[0]!;
  assert.deepEqual(hit.fields.map((f) => [f.name, f.field]), [['title', 0], ['note', 3]]);
});

test('a field matched only by other query words still shows', () => {
  const hit = find([doc('1', 'Annual', 'pricing')], 'annual pricing')[0]!;
  assert.deepEqual(hit.fields.map((f) => f.name), ['title', 'body']);
});

test('an empty or blank query, or one of punctuation only, finds nothing', () => {
  const docs = [doc('1', 'Pricing')];
  for (const q of ['', '   ', '\t\n', '…!?', '--']) assert.deepEqual(find(docs, q), [], JSON.stringify(q));
});

test('punctuation in the query splits words and is never a pattern', () => {
  assert.deepEqual(ids([doc('1', 'C++ beta (plan)'), doc('2', 'Alpha')], 'beta*(pl'), ['1']);
  assert.deepEqual(ids([doc('1', 'a.b')], '.*'), []);
});

test('a one-letter word matches word starts only, so one keystroke does not light every card', () => {
  assert.deepEqual(ids([doc('1', 'Apple'), doc('2', 'Pricing')], 'p'), ['2']);
});

test('a one-letter word is never a whole-word match, so the article "a" in the text never beats a title', () => {
  assert.deepEqual(ids([doc('1', 'Roadmap', 'a plan, a goal, a date'), doc('2', 'Agenda')], 'a'), ['2', '1']);
});

test('limit keeps the best hits', () => {
  const docs = [doc('1', 'Roadmap', 'pricing'), doc('2', 'Pricing'), doc('3', 'Repricing')];
  assert.deepEqual(find(docs, 'pric', 1).map((h) => h.id), ['2']);
});

test('an index answers many queries and a document with no fields is never a hit', () => {
  const index = searchIndex([doc('1', 'Pricing'), { id: '2', fields: [] }]);
  assert.deepEqual(search(index, 'pric').map((h) => h.id), ['1']);
  assert.deepEqual(search(index, 'pricing').map((h) => h.id), ['1']);
  assert.deepEqual(search(index, 'roadmap'), []);
});

test('scores are positive and a better hit scores higher', () => {
  const [a, b] = find([doc('1', 'Pricing'), doc('2', 'Roadmap', 'pricing')], 'pricing');
  assert.ok(a!.score > b!.score && b!.score > 0);
});
