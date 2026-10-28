# packages/search

Find-as-you-type over a set of documents, shared by the board's search box and (later) nclite's
Journal (`docs/principles.md` § Shared pieces are shared). A caller turns its records into
`SearchDoc`s (the board's cards: `#actions` `boardSearchDocs`), builds an index once per change, and
asks it on every keystroke. Pure functions, no DOM, no dependencies, imports nothing from the repo.

- **Depends on**: nothing.
- **Used by**: `packages/actions` (the `SearchDoc` type, for `boardSearchDocs`); `apps/board`
  (`board/find/go-to-card.ts` `createMatches`: `searchIndex`, `search`).
- **Public API** (`src/index.ts`): `searchIndex(docs)`, `search(index, query, { limit? })`, and the
  types `SearchDoc`, `SearchField`, `SearchHit`, `FieldHit`, `Range`, `SearchIndex`, `SearchOptions`
  (`IndexedDoc` and `IndexedField` are the index's insides).

## What a query does

- **Words in any order**: "pricing annual" finds "Annual pricing".
- **Part of a word**: "pric" finds "Pricing", and "repricing" ranked lower. A one-letter word
  matches the start of a word only, so the first keystroke does not light every document.
- **Case and accents ignored**: text is decomposed (NFD), combining marks stripped, lower-cased;
  "resume" finds "Résumé", "CAFE" finds "café". Words are runs of letters and digits; anything
  else splits them, and is never read as a pattern.
- **Every word must match** somewhere in the document (AND). A blank query, or one with no letters
  or digits, finds nothing.
- **Best first**: a word's best field counts in full (its `weight` times the fit: whole word 3,
  word start 2, inside a word 1), each other field holding it adds a fifth of its own value, and
  each further match in a field adds 0.25 to that field's fit, at most twice (`search.ts`). So a title outranks text, a word
  start outranks the middle of a word, and more matched words outrank fewer, without a word
  repeated many times outranking a better fit. Equal scores keep the documents' order.
- **Which part matched**: each hit lists every field that matched, by name and by its place in
  the document (`field`, so two notes stay apart), with `ranges`, sorted and merged, as offsets
  into the field's original text: `text.slice(start, end)` is what to highlight, accents kept.

## Budget

1,000 documents of about 500 characters answer a 3-word query in under 5 ms and index in under
100 ms (`tests/search.timing.ts`, run by `npm run test:timing`).

## Not yet

- No typo tolerance (fuzzy matching): "pricng" finds nothing.
- No stemming or synonyms: "priced" does not find "pricing", nor "cost" "price".
- Letters that fold to two (German "ß" and "ss") are not equated.
