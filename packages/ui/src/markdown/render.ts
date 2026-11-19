// Markdown, the front function (D-023): the one renderer every Markdown surface calls (card
// bodies and notes now; replies, the chat and parking bundles later). Source to safe HTML with
// the pattern's CSS hooks (markdown.css); no inline styles, no DOM, so it runs under node --test.
// blocks.ts splits the lines into blocks; inline.ts renders each block's text, escaped; table.ts a table; image.ts
// writes `![alt](path)` (D-048), unless images are off; entries.ts finds a bold lead (a dated node's entries, D-105 5). No switch of its own: whoever renders passes the
// flags it was given (`MarkdownOptions`), so two boards on one page can differ; left out, each flag's default.
import { flagOn } from '#format';
import { parseBlocks } from './blocks.ts';
import type { Block } from './blocks.ts';
import type { ImageWriter } from './image.ts';
import { imageMarkup } from './image.ts';
import { esc, renderInline } from './inline.ts';
import { tableHtml } from './table.ts';
import { boldLead } from './entries.ts';

export interface MarkdownOptions {
  /** aria-level of a `#` label (1 to 6). Default 4: the card title is an h3. */
  headingLevel?: number;
  /** Draw `![alt](path)` as its image (D-048); false keeps its source text. The cardImages flag; default, its default. */
  images?: boolean;
  /** Allow an svg among them (D-064). The svgImages flag; default, its default. */
  svg?: boolean;
  /** Where the pictures are served: a path goes after it. Default `IMAGE_ROUTE`. */
  imageRoute?: string | undefined;
  /** `#` large and `##` medium, tables of up to 4 columns and thematic breaks; false, every heading is the
   * small label and tables and breaks stay text. The markdownMore flag; default, its default. */
  more?: boolean;
  /** `+++ Label` to a closing `+++` line: the lines between are detail behind a disclosure triangle,
   * closed until the person opens it. The cardDetails flag; default, its default. */
  details?: boolean;
  /** Entries (D-105 5): a `###` heading and the blocks after it up to the next heading, rule or entry start; a
   * paragraph opening with a bold run; a top-level list item opening with one (it stays an `li`). Each draws as
   * `.vb-md-entry` with its `.vb-md-entry-name`. The node template turns it on for a dated node; default false. */
  entries?: boolean;
}

/** Longer input is cut here with an ellipsis (2c_FE_01, Safety). */
export const MARKDOWN_MAX = 20_000;

interface Ctx { level: number; lists: number; tight: boolean; image: ImageWriter | undefined; more: boolean }

const inlineOf = (b: Block, ctx: Ctx): string => renderInline(b.lines.join('\n').trim(), ctx.image);

const kids = (b: Block, ctx: Ctx): string => b.kids.map((k) => blockHtml(k, ctx)).join('');

/** A list; with `entries` (a top-level list in a dated node), each item opening with a bold name is an entry that keeps
 *  its `li`, and the other items keep their bullets. */
function list(b: Block, ctx: Ctx, entries = false): string {
  const tag = b.ordered ? 'ol' : 'ul';
  const start = b.ordered && b.startNum !== 1 ? ` start="${b.startNum}"` : '';
  const inner = { ...ctx, lists: ctx.lists + 1, tight: b.tight === true };
  const item = (li: Block): string => (entries && entryItem(li, inner)) || `<li>${kids(li, inner)}</li>`;
  return `<${tag} class="vb-md-list"${start}>${b.kids.map(item).join('')}</${tag}>`;
}

/** The item's opening paragraph as a bold lead, if it is one. */
const itemLead = (li: Block, ctx: Ctx) => (li.kids[0]?.t === 'para' ? boldLead(inlineOf(li.kids[0], ctx)) : undefined);

/** A list item that opens with a bold name, as an entry: the name, the rest of its paragraph, then its other blocks. */
function entryItem(li: Block, ctx: Ctx): string | undefined {
  const lead = itemLead(li, ctx);
  if (!lead) return undefined;
  // A space between the name and a tight item's text, so the two never run together when read as text.
  const rest = !lead.rest ? '' : ctx.tight ? ` ${lead.rest}` : `<p class="vb-md-p">${lead.rest}</p>`;
  return `<li class="vb-md-entry"><strong class="vb-md-entry-name">${lead.name}</strong>${rest}${li.kids.slice(1).map((k) => blockHtml(k, ctx)).join('')}</li>`;
}

/** A paragraph opening with a bold name, as an entry: the name, then the rest as the entry's text. */
function entryPara(b: Block, ctx: Ctx): string | undefined {
  const lead = boldLead(inlineOf(b, ctx));
  if (!lead) return undefined;
  return `<div class="vb-md-entry"><strong class="vb-md-entry-name">${lead.name}</strong>${lead.rest ? `<p class="vb-md-p">${lead.rest}</p>` : ''}</div>`;
}

/** Where a `###` entry stops: a heading, a rule, or the start of another entry. */
const endsEntry = (b: Block, ctx: Ctx): boolean => b.t === 'head' || b.t === 'hr'
  || (b.t === 'para' && boldLead(inlineOf(b, ctx)) !== undefined) || (b.t === 'list' && b.kids.some((li) => itemLead(li, ctx)));

/** A document's blocks with entries (MarkdownOptions.entries): a `###` heading and what follows it, bold leads, and
 *  top-level lists whose items may be entries. `##`, `####`, quotes, tables, code and details stay as they are. */
function entryDoc(doc: Block, ctx: Ctx): string {
  const blocks = doc.kids;
  let out = '';
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    if (b.t === 'head' && b.level === 3) {
      let j = i + 1;
      while (j < blocks.length && !endsEntry(blocks[j]!, ctx)) j++;
      const name = `<span class="vb-md-entry-name" role="heading" aria-level="${ctx.level}">${inlineOf(b, ctx)}</span>`;
      out += `<div class="vb-md-entry">${name}${blocks.slice(i + 1, j).map((k) => blockHtml(k, ctx)).join('')}</div>`;
      i = j - 1;
    } else if (b.t === 'para') out += entryPara(b, ctx) ?? blockHtml(b, ctx);
    else out += b.t === 'list' ? list(b, ctx, true) : blockHtml(b, ctx);
  }
  return out;
}

/** A list nested deeper than one level is plain text: each item a paragraph led by its marker. */
function flatList(b: Block, ctx: Ctx): string {
  const rest = { ...ctx, tight: false };
  return b.kids.map((li) => {
    const [first, ...others] = li.kids;
    const lead = first?.t === 'para' ? `${esc(li.marker!)} ${inlineOf(first, ctx)}` : esc(li.marker!);
    const tail = (first?.t === 'para' ? others : li.kids).map((k) => blockHtml(k, rest)).join('');
    return `<p class="vb-md-p">${lead}</p>${tail}`;
  }).join('');
}

/** `#` large, `##` medium, `###` to `######` the small label (markdownMore); without it, every one the label. */
function heading(b: Block, ctx: Ctx): string {
  const cls = !ctx.more || b.level! >= 3 ? 'vb-md-label' : `vb-md-h${b.level}`;
  return `<span class="${cls}" role="heading" aria-level="${ctx.level}">${inlineOf(b, ctx)}</span>`;
}

function blockHtml(b: Block, ctx: Ctx): string {
  switch (b.t) {
    case 'para': return ctx.tight ? inlineOf(b, ctx) : `<p class="vb-md-p">${inlineOf(b, ctx)}</p>`;
    case 'head': return heading(b, ctx);
    case 'hr': return '<hr class="vb-md-rule">';
    case 'table': return tableHtml(b.lines, b.aligns!, (s) => renderInline(s, ctx.image));
    case 'quote': return `<blockquote class="vb-md-quote">${kids(b, { ...ctx, tight: false })}</blockquote>`;
    case 'code': return `<pre class="vb-md-code" tabindex="0"><code>${esc(b.lines.join(''))}</code></pre>`;
    case 'list': return ctx.lists >= 2 ? flatList(b, ctx) : list(b, ctx);
    default: return kids(b, ctx);
  }
}

/** One run of the source: plain Markdown, or detail behind a disclosure with its label. */
export type DetailPart = { text: string; label?: string };

/** The start of a detail: `+++ Label`; its end: `+++` alone. */
const DETAIL_OPEN = /^\+\+\+[ \t]+(\S.*)$/;
const DETAIL_CLOSE = /^\+\+\+[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/** The source cut at its details (cardDetails): `+++ Label` opens one and `+++` closes it; one left
 * open runs to the end. Never inside fenced code, never nested. */
export function splitDetails(src: string): DetailPart[] {
  const parts: DetailPart[] = [];
  let lines: string[] = [];
  let label: string | undefined;
  let fence: string | undefined;
  const flush = (): void => {
    if (lines.length || label !== undefined) parts.push({ text: lines.join('\n'), ...(label !== undefined && { label }) });
    lines = [];
  };
  for (const line of src.split('\n')) {
    const f = FENCE.exec(line)?.[1];
    if (f && fence === undefined) fence = f[0];
    else if (f && f[0] === fence) fence = undefined;
    const open = fence === undefined && label === undefined ? DETAIL_OPEN.exec(line) : null;
    if (open) { flush(); label = open[1]!.trim(); continue; }
    if (fence === undefined && label !== undefined && DETAIL_CLOSE.test(line)) { flush(); label = undefined; continue; }
    lines.push(line);
  }
  flush();
  return parts;
}

/** The D-023 Markdown subset to HTML, safe to set as innerHTML: every text run is escaped. */
export function renderMarkdown(src: string, opts: MarkdownOptions = {}): string {
  let text = src;
  if (text.length > MARKDOWN_MAX) {
    const cut = /[\uD800-\uDBFF]/.test(text[MARKDOWN_MAX - 1]!) ? MARKDOWN_MAX - 1 : MARKDOWN_MAX;
    text = `${text.slice(0, cut)}…`;
  }
  const h = opts.headingLevel;
  const level = h !== undefined && Number.isInteger(h) && h >= 1 && h <= 6 ? h : 4;
  const image = (opts.images ?? flagOn('cardImages')) ? imageMarkup(opts.svg, opts.imageRoute) : undefined;
  const more = opts.more ?? flagOn('markdownMore');
  const ctx: Ctx = { level, lists: 0, tight: false, image, more };
  const html = (part: string): string => (opts.entries ? entryDoc : kids)(parseBlocks(part, more), ctx);
  if (!(opts.details ?? flagOn('cardDetails')) || !text.includes('+++')) return html(text);
  return splitDetails(text).map((p) => (p.label === undefined ? html(p.text)
    : `<details class="vb-md-details"><summary class="vb-md-summary">${renderInline(p.label, undefined)}</summary><div class="vb-md-detail">${html(p.text)}</div></details>`)).join('');
}
