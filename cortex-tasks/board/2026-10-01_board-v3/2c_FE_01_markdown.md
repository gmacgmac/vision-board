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

1. [x] Tests first (above); see them fail.
2. [x] Blocks, then inline, then the front function, until the tests pass.
3. [x] Wire the two callers; style from tokens.
4. [x] Gallery section and fixture bodies; view the gallery and board in dark and light, then
   update the baselines and list their paths.
5. [x] APCA: run `temp/apca-2b.mjs` (or extend it) for any new colour pair (link, inline code,
   quote text) and record the scores here. A pair under its tier is reported, not shipped.

## Validation

- [x] `npm test`, `npm run check`, `npm run verify`, `npm run test:pages` all exit 0 (read each
  exit code yourself)
- [x] The `EXCLUDED` table lists every deliberate difference with a reason
- [x] No new dependency; the spec file is test data, not a package

## Constraints

No tokens or other protected files (if a new token is needed, stop and report the exact value).
No new dependency. No change to `layout` or `format` source. No commits. Deviation from the
pattern above, or a CommonMark example that the subset cannot pass without breaking D-023: stop
and report. Write long files in chunks (create the first section, then append).

## Implementation Notes

**Status** (2026-10-04, implementer): done, not committed. One APCA pair is under its tier in
dark (below); it needs a token decision before it ships.

**Files and symbols**
- New pattern `packages/ui/src/markdown/`: `blocks.ts` (`parseBlocks`, `Block`; CommonMark's
  block algorithm, 265 lines), `inline.ts` (`renderInline`, `esc`; delimiter and bracket stacks,
  299 lines), `render.ts` (`renderMarkdown`, `MarkdownOptions`, `MARKDOWN_MAX`, 62 lines),
  `markdown.css`, `pattern.json` (with `entry` and `selector` instead of `tag`: no element).
- Front door `packages/ui/src/index.ts` exports `renderMarkdown`, `MARKDOWN_MAX`, `MarkdownOptions`.
  `esc` now lives in `inline.ts` (the one escaper) and `node-template.ts` re-exports it, so the
  public API is unchanged.
- Callers: `nodeTemplate` renders `n.body` into `div.vb-node-body`; `vb-node.ts` `update()` sets
  the note with `renderMarkdown` as `innerHTML`, only when the note text changed (a focused link
  in it keeps focus); the note keeps its three-line clamp. `node.css`: body is a grid on the
  content gap; code in a note sits on `--vb-surface-deep`.
- Page: `markdown.css` imported beside `node.css` in `apps/board/src/main.ts` and the gallery.
- Gallery: `markdown-section.ts` (uses `card()`, now exported from `node-section.ts`), the
  `markdown` region in `gallery.ledger.jsonl` (seq 105-115: one card per construct, one with
  everything, one with a Markdown note), `REGION_MARKDOWN` in `fixture.ts`, the section meta
  line shows `entry` when a pattern has no tag.
- `roadmap.ledger.jsonl`: items 9 (Framework) and 13 (Walking skeleton) have a label and a list.
- Docs: `components.md` § Markdown, `packages/ui/README.md` public API, node `pattern.json`
  (body and note are Markdown), `docs/specification/modules.md` regenerated (`npm run map`).
- Tests: `markdown-commonmark.test.ts`, `markdown-safety.test.ts`, `markdown-render.test.ts`,
  fixture `tests/fixtures/commonmark-0.31.2.json` (spec.commonmark.org, CC BY-SA 4.0, README).

**Gates** (exit codes read): `npm test` 0 (149 tests, 149 pass); `npm run check` 0 (svelte-check
0 errors, 0 warnings; tsc clean); `npm run verify` 0 (1 warning, pre-existing:
`apps/board/src/board/controller.ts` 344 lines); `npm run test:pages` 0 (26 passed).

**Existing tests modified**
- `node-template.test.ts`: two tests added (list + label classes; `<b>` escaped). No existing
  assertion changed.
- `gallery.spec.ts`: the "every pattern has a section" test reads `tag ?? selector`, because the
  markdown pattern has no element; two Markdown tests added (constructs, note clamp, scrolling
  focusable code, refused links; axe and section screenshot in dark and light).

**Baselines re-recorded** (each viewed first): `tests/pages/__screenshots__/board.spec.ts/board-dark-darwin.png`,
`board-light-darwin.png` (items 9 and 13 now show a label and a list);
`tests/pages/__screenshots__/gallery.spec.ts/gallery-dark-darwin.png`, `gallery-light-darwin.png`
(new Markdown section first); new `markdown-dark-darwin.png`, `markdown-light-darwin.png`.

**EXCLUDED**: 101 of the 465 examples in the 13 covered sections (364 pass). By reason: reference
links and definitions 41, raw HTML 23, indented code 23, HTML blocks 3, thematic breaks 3, lists
nested past one level 3, setext headings 2, images 2, tabs expanded to spaces 1 (#13). The test also
fails if an excluded example starts passing. The comparison maps our classes, the label (any
level) and the quote back to plain tags, drops info-string classes, and turns a spec link our
scheme rule refuses into its text.

**APCA** (APCA-W3 0.0.98G-4g, worst case over the six kind tints; script `temp/2c-md/apca.mjs`):

| Pair | Tier | Light | Dark |
|---|---|---|---|
| link (accent-text) on the card tint | 45 | 65.0 | 45.5 |
| link (accent-text) in a quote or note | 45 | 56.5 | **44.0 FAIL** |
| label (ink-subtle) on the card tint | 45 | 66.4 | 46.5 |
| paragraph and list text (ink) on the card | 60 | 84.5 | 69.4 |
| list bold (ink-strong) on the card | 60 | 94.7 | 92.6 |
| quote text (ink) on its tint | 60 | 76.0 | 67.9 |
| inline code (ink-strong) on surface-sunken / surface-deep | 45 | 95.1 / 88.7 | 93.8 / 91.9 |
| code block text (ink) on surface-sunken / surface-deep | 60 | 84.8 / 78.5 | 70.5 / 68.6 |

**Open items**
1. Dark link inside a quote or note: Lc 44.0-44.9 (tier 45). Fixing it needs a token, which is
   protected: dark `--vb-accent-text` `#ff5cbe` to `#ff66c2` gives Lc 46.1 or more in every tint
   (it also colours the "Commented" state word). Not changed.
2. Found while measuring, not changed here: the note's "who" line (`--kind` on the note tint, from
   2b) is under 45 in dark for decision (44.9) and topic (44.8).
3. Look choices to confirm: the pattern says list bold in `--vb-ink`, but 01b's `.ul b` uses its
   strongest ink, so bold is `--vb-ink-strong` (the title colour). The code block cap is
   `calc(var(--vb-space-6) * 5)` (160px): no height token exists. Inline code is `0.92em`.
4. An empty `#` heading renders an empty label (as CommonMark does); axe's `empty-heading` is a
   best-practice rule, outside the WCAG tags the page tests run.
5. Links open in a new tab (`target="_blank"`) with no visible hint; WCAG AA does not require one.
