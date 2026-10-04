# 2c_FE_01_markdown: Our own Markdown renderer, used by cards and notes

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Stage 2c) ·
> **Decision**: D-023 · **Pattern**: `docs/specification/components.md` · **Look**: mockup
> `01b-cards-content-first.html` (`.p`, `.lbl`, `.ul`, `.reply`) · **Model**: Opus 5.5

## Objective

One pure function turns the fixed Markdown subset of D-023 into safe HTML. Card bodies and the
saved note on a card render through it, styled as 01b. Anything outside the subset renders as
plain text, and raw HTML is always escaped.

## Context

- Repo: `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board`, branch `board-v3`.
  Node 22.23.1 via nvm (put `$HOME/.nvm/versions/node/v22.23.1/bin` first on PATH).
- Card bodies are plain strings today (`ViewNode.body`, escaped in `nodeTemplate`); the note text
  is set with `textContent` in `vb-node.ts` (`update`). Replies, the chat and parking bundles use
  the same renderer later; do not wire them now.
- The renderer is a pattern with one definition (rule 1): every Markdown surface calls it.

## The pattern (defined by the orchestrator; follow it)

1. **Place**: `packages/ui/src/markdown/` with `pattern.json`, a front-door export
   `renderMarkdown(src: string, opts?: { headingLevel?: number }): string` from
   `packages/ui/src/index.ts`. No DOM, no browser APIs: it runs and is tested under `node --test`.
2. **Split by job** (rule 2): `blocks.ts` (lines into paragraphs, lists, `###` labels, `>` quotes,
   fenced code), `inline.ts` (bold, italic, strikethrough, inline code, links, escapes),
   `render.ts` (the front function). Each under 300 lines, functions about 50.
3. **Subset** (D-023): paragraphs; `**bold**`/`__bold__`; `*italic*`/`_italic_`; `~~strike~~`;
   `` `code` ``; `[text](url)` and `<https://…>` autolinks; `-`/`*`/`+` bullets and `1.` numbered
   lists (one level of nesting); `###` (any `#`…`######`) drawn as a small label; `>` quotes
   drawn as a callout; fenced code blocks (``` ``` ```), capped by a token-driven max height with
   scroll. Hard line break: two trailing spaces or a backslash. Everything else (tables, images,
   HTML blocks, setext headings, reference links, indented code) renders as escaped plain text.
4. **Output classes** (the CSS hooks; no inline styles): `p.vb-md-p`, `span.vb-md-label`
   (role="heading", `aria-level` from `opts.headingLevel`, default 4, since the card title is h3),
   `ul.vb-md-list` / `ol.vb-md-list`, `blockquote.vb-md-quote`, `pre.vb-md-code > code`,
   `code.vb-md-icode`, `a.vb-md-link`.
5. **Safety**: escape `& < > " '` in every text run before any markup is added. Links: only
   `http:`, `https:` and `mailto:` survive; anything else (`javascript:`, `data:`, relative,
   protocol-relative) renders the link text as plain text. Links get
   `rel="noopener noreferrer" target="_blank"`. Input over 20,000 characters is cut there with an
   ellipsis. No regex with catastrophic backtracking: a 20,000-character adversarial string
   (`*` x 10,000, `[` x 10,000, `` ` `` x 10,000) renders in under 50 ms, tested.
6. **Look** (01b, tokens only): paragraph = `.p`; label = `.lbl`; lists = `.ul` with bold in
   `--vb-ink`; quote = the `.reply` box (soft tint of the card's `--kind` into
   `--vb-surface-2`, radius, padding), without a "who" line; inline code and code blocks in the
   mono font on `--vb-surface-2`. Links in the accent text colour, underlined. Styles live in
   `packages/ui/src/markdown/markdown.css`, imported by the page beside `node.css`.
7. **Callers**: `nodeTemplate` renders `n.body` through `renderMarkdown` into
   `div.vb-node-body`. `vb-node.ts` sets the note text with `renderMarkdown(st.note.text)` as
   `innerHTML` (safe because the renderer escapes), and the note keeps its three-line clamp.

## Tests (write them first)

1. **CommonMark examples**: download the spec's examples once (`spec.json` for the current
   CommonMark version, from spec.commonmark.org; a plain read, nothing sent) into
   `packages/ui/tests/fixtures/commonmark-<version>.json`, with a README line giving the source
   URL, version and licence (CC BY-SA 4.0). A test runs every example in the sections the subset
   covers (paragraphs, emphasis, code spans, links and autolinks, lists, block quotes, fenced code,
   backslash escapes, hard line breaks, ATX headings, raw HTML). Compare after mapping our classes
   and the label and quote shapes back to plain CommonMark tags, so the comparison is fair.
   Examples we deliberately differ on go in one `EXCLUDED` table in the test, each with its number
   and a one-line reason (for example "nested lists deeper than one level"). The test fails if an
   example outside the table fails, so the table is the full list of differences.
2. **Safety**: raw `<script>`, `<img onerror>`, attribute breakout in link text and URL,
   `javascript:` and `data:` links, entity tricks (`&#106;avascript:`), and the 50 ms
   adversarial cases.
3. **Callers**: `node-template` tests: a body with a list and a label renders the classes;
   a body with `<b>` renders it escaped. A page test opens the gallery Markdown sample and checks
   it in dark and light (screenshot baseline, axe, no console errors).

## Inputs

- **Create**: `packages/ui/src/markdown/{blocks.ts,inline.ts,render.ts,markdown.css,pattern.json}`,
  `packages/ui/tests/markdown-*.test.ts`, `packages/ui/tests/fixtures/`
- **Modify**: `packages/ui/src/index.ts`, `packages/ui/src/node/{node-template.ts,vb-node.ts,node.css}`,
  `packages/ui/README.md` (public API), wherever `node.css` is imported by the board and the
  gallery, `apps/board/src/gallery/` (a Markdown section from fixture data: one card per
  construct and one with everything), `apps/board/src/gallery/gallery.ledger.jsonl`,
  `packages/format/fixtures/roadmap.ledger.jsonl` (give two existing bodies a short list and a
  label, so `npm run dev` shows it), `tests/pages/` baselines,
  `docs/specification/components.md` (one short "Markdown" section pointing to the pattern)

## Steps

1. [ ] Tests first (above); see them fail.
2. [ ] Blocks, then inline, then the front function, until the tests pass.
3. [ ] Wire the two callers; style from tokens.
4. [ ] Gallery section and fixture bodies; view the gallery and board in dark and light, then
   update the baselines and list their paths.
5. [ ] APCA: run `temp/apca-2b.mjs` (or extend it) for any new colour pair (link, inline code,
   quote text) and record the scores here. A pair under its tier is reported, not shipped.

## Validation

- [ ] `npm test`, `npm run check`, `npm run verify`, `npm run test:pages` all exit 0 (read each
  exit code yourself)
- [ ] The `EXCLUDED` table lists every deliberate difference with a reason
- [ ] No new dependency; the spec file is test data, not a package

## Constraints

No tokens or other protected files (if a new token is needed, stop and report the exact value).
No new dependency. No change to `layout` or `format` source. No commits. Deviation from the
pattern above, or a CommonMark example that the subset cannot pass without breaking D-023: stop
and report. Write long files in chunks (create the first section, then append).

## Implementation Notes

*(Filled by the implementer: status, files and symbols, gates with counts, existing tests
modified and why, baselines re-recorded, APCA scores, EXCLUDED count, open items.)*
