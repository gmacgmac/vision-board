// Markdown, inline layer (D-023): bold, italic, strikethrough, inline code, links, autolinks, escapes
// and hard breaks, by CommonMark's inline algorithm (delimiter and bracket stacks over linked runs).
// Every text run is escaped before markup is added; raw HTML, images, entities and reference links
// stay escaped text. Scans are loops or sticky patterns without nested repetition, so adversarial
// input stays linear (markdown-safety test).

/** Escapes the five HTML-significant characters. The one escaper for every text run in packages/ui. */
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A piece of output: text (escaped when written) or finished HTML. Linked so a span is wrapped in place. */
interface Run { s: string; html: boolean; next: Run | null }

/** An emphasis or strike delimiter run waiting for its partner. */
interface Delim { run: Run; ch: string; len: number; left: number; canOpen: boolean; canClose: boolean; prev: Delim | null; next: Delim | null }

/** An open `[` or `![`: `delim` is the top of the delimiter stack when it was pushed. */
interface Bracket { run: Run; image: boolean; start: number; delim: Delim | null; active: boolean; prev: Bracket | null }

/** `ticks`: backtick runs by length (start positions, ascending), with a read pointer per length. */
interface State {
  src: string; pos: number; head: Run | null; tail: Run | null; delims: Delim | null; brackets: Bracket | null;
  ticks: Map<number, number[]> | null; tickAt: Map<number, number>;
}

const ASCII_PUNCT = /[!-/:-@[-`{-~]/;
const UNESCAPE = /\\([!-/:-@[-`{-~])/g;
const WS = /\s/u, PUNCT = /[\p{P}\p{S}]/u;
const SPECIAL = /[\\`*_~[\]!<\n]/g;
const URI = /[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\x00-\x20<>\x7f]*>/y;
const EMAIL = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*>/y;
const URL_ENCODE = /%(?![0-9A-Fa-f]{2})|[^A-Za-z0-9;/?:@&=+$,\-_.!~*'()#%]/gu;
/** The only schemes a link may keep (2c_FE_01, Safety). */
const LINK_SCHEMES = /^(?:https?|mailto):/i;

const unescape = (s: string): string => s.replace(UNESCAPE, '$1');

/** Percent-encodes a URL the way CommonMark's reference renderers do, keeping existing %XX. */
const encodeUrl = (s: string): string => s.replace(URL_ENCODE, (c) =>
  (c.length === 1 && c >= '\ud800' && c <= '\udfff' ? '%EF%BF%BD' : encodeURIComponent(c)));

/** An <a> for an allowed URL; for any other URL, just its text (Safety). */
function link(url: string, title: string | undefined, inner: string): string {
  if (!LINK_SCHEMES.test(url)) return inner;
  const t = title === undefined ? '' : ` title="${esc(title)}"`;
  return `<a class="vb-md-link" href="${esc(encodeUrl(url))}"${t} rel="noopener noreferrer" target="_blank">${inner}</a>`;
}

/** Adds a run and moves past `advance` source characters. */
function push(st: State, s: string, advance: number, html = false): Run {
  const run: Run = { s, html, next: null };
  if (st.tail) st.tail.next = run; else st.head = run;
  st.tail = run;
  st.pos += advance;
  return run;
}

/** Writes runs from `from` up to (not including) `to`. */
function flatten(from: Run | null, to: Run | null): string {
  let out = '';
  for (let r = from; r && r !== to; r = r.next) out += r.html ? r.s : esc(r.s);
  return out;
}

function removeDelim(st: State, d: Delim): void {
  if (d.prev) d.prev.next = d.next;
  if (d.next) d.next.prev = d.prev; else st.delims = d.prev;
}

/** Replaces the runs strictly between `a` and `b` with one `<tag>…</tag>` run. */
function wrap(a: Run, b: Run, tag: string): void {
  a.next = { s: `<${tag}>${flatten(a.next, b)}</${tag}>`, html: true, next: b };
}

/** CommonMark's rule of 3, and strikethrough's equal pair of two tildes. */
function canPair(o: Delim, c: Delim): boolean {
  if (o.ch === '~') return o.len === 2 && c.len === 2;
  return !((o.canClose || c.canOpen) && (o.len + c.len) % 3 === 0 && !(o.len % 3 === 0 && c.len % 3 === 0));
}

/** Pairs an opener with a closer; returns the next closer to look at. */
function pair(st: State, o: Delim, c: Delim): Delim | null {
  const use = o.ch === '~' ? 2 : o.left >= 2 && c.left >= 2 ? 2 : 1;
  o.left -= use; c.left -= use;
  o.run.s = o.run.s.slice(0, o.left); c.run.s = c.run.s.slice(0, c.left);
  wrap(o.run, c.run, o.ch === '~' ? 'del' : use === 2 ? 'strong' : 'em');
  for (let d = c.prev; d && d !== o; d = d.prev) removeDelim(st, d);
  if (o.left === 0) removeDelim(st, o);
  if (c.left > 0) return c;
  removeDelim(st, c);
  return c.next;
}

/** Pairs every delimiter above `bottom` (CommonMark "process emphasis"), then drops them from the stack. */
function processEmphasis(st: State, bottom: Delim | null): void {
  let closer: Delim | null = null;
  for (let d = st.delims; d && d !== bottom; d = d.prev) closer = d;
  const floors = new Map<string, Delim | null>();
  while (closer) {
    if (!closer.canClose) { closer = closer.next; continue; }
    const key = `${closer.ch}${closer.canOpen ? 1 : 0}${closer.len % 3}`;
    const floor = floors.has(key) ? floors.get(key) : bottom;
    let o = closer.prev;
    while (o && o !== bottom && o !== floor && !(o.ch === closer.ch && o.canOpen && canPair(o, closer))) o = o.prev;
    if (o && o !== bottom && o !== floor) { closer = pair(st, o, closer); continue; }
    floors.set(key, closer.prev);
    const next = closer.next;
    if (!closer.canOpen) removeDelim(st, closer);
    closer = next;
  }
  while (st.delims && st.delims !== bottom) removeDelim(st, st.delims);
}

/** Skips spaces and tabs with at most one line ending. */
function skipSpace(s: string, i: number): number {
  for (let nl = false; s[i] === ' ' || s[i] === '\t' || (s[i] === '\n' && !nl); i += 1) nl ||= s[i] === '\n';
  return i;
}

/** From the opener at `i` to `close`, past backslash escapes; null at a `stop` character or the end. */
function scanTo(s: string, i: number, close: string, stop: string): [string, number] | null {
  for (let j = i + 1; j < s.length; j += 1) {
    if (s[j] === '\\' && ASCII_PUNCT.test(s[j + 1] ?? '')) j += 1;
    else if (s[j] === close) return [s.slice(i + 1, j), j + 1];
    else if (stop.includes(s[j]!)) return null;
  }
  return null;
}

/** A link destination at `i`: `<…>` or a bare run with balanced parentheses. [text, end] or null. */
function destination(s: string, i: number): [string, number] | null {
  if (s[i] === '<') return scanTo(s, i, '>', '<\n');
  let depth = 0, j = i;
  for (; j < s.length; j += 1) {
    const c = s[j]!;
    if (c === '\\' && ASCII_PUNCT.test(s[j + 1] ?? '')) { j += 1; continue; }
    if (c <= ' ' || c === '\x7f') break;
    if (c === '(') { depth += 1; if (depth > 32) return null; } // CommonMark allows a nesting limit; it keeps scans short
    else if (c === ')') { if (depth === 0) break; depth -= 1; }
  }
  return depth === 0 ? [s.slice(i, j), j] : null;
}

/** A link title at `i`: "…", '…' or (…). [text, end] or null. */
function title(s: string, i: number): [string, number] | null {
  if (s[i] === '(') return scanTo(s, i, ')', '(');
  return s[i] === '"' || s[i] === "'" ? scanTo(s, i, s[i]!, '') : null;
}

/** `(destination "title")` right after `]`. */
function inlineLink(s: string, i: number): { url: string; title?: string; end: number } | null {
  if (s[i] !== '(') return null;
  let j = skipSpace(s, i + 1);
  const dest = s[j] === ')' ? ['', j] as [string, number] : destination(s, j);
  if (!dest) return null;
  j = skipSpace(s, dest[1]);
  const t = j > dest[1] ? title(s, j) : null;
  if (t) j = skipSpace(s, t[1]);
  if (s[j] !== ')') return null;
  return { url: unescape(dest[0]), ...(t ? { title: unescape(t[0]) } : {}), end: j + 1 };
}

/** Length of the run of the character at `i`. */
const runLength = (s: string, i: number): number => { let j = i; while (s[j] === s[i]) j += 1; return j - i; };

/** Start of the next backtick run of exactly `n` after `from`, or -1. Pointers only move forward. */
function closingTicks(st: State, n: number, from: number): number {
  if (!st.ticks) {
    st.ticks = new Map();
    for (let i = st.src.indexOf('`'), len = 0; i >= 0; i = st.src.indexOf('`', i + len)) {
      len = runLength(st.src, i);
      (st.ticks.get(len) ?? st.ticks.set(len, []).get(len)!).push(i);
    }
  }
  const list = st.ticks.get(n) ?? [];
  let k = st.tickAt.get(n) ?? 0;
  while (k < list.length && list[k]! < from) k += 1;
  st.tickAt.set(n, k);
  return k < list.length ? list[k]! : -1;
}

function codeSpan(st: State): void {
  const { src, pos } = st;
  const n = runLength(src, pos);
  const close = closingTicks(st, n, pos + n);
  if (close < 0) { push(st, src.slice(pos, pos + n), n); return; }
  let code = src.slice(pos + n, close).replace(/\n/g, ' ');
  if (code.length > 1 && code[0] === ' ' && code[code.length - 1] === ' ' && /[^ ]/.test(code)) code = code.slice(1, -1);
  push(st, `<code class="vb-md-icode">${esc(code)}</code>`, close + n - pos, true);
}

/** The character before `i` and at `i`, as code points ('\n' past either end). */
function around(s: string, i: number): [string, string] {
  const lo = i > 1 && s.charCodeAt(i - 1) >= 0xdc00 && s.charCodeAt(i - 1) <= 0xdfff ? i - 2 : i - 1;
  return [lo < 0 ? '\n' : String.fromCodePoint(s.codePointAt(lo)!), i >= s.length ? '\n' : String.fromCodePoint(s.codePointAt(i)!)];
}

/** A run of `*`, `_` or `~`: text now, and a delimiter for processEmphasis (CommonMark flanking rules). */
function delimRun(st: State): void {
  const { src, pos } = st;
  const ch = src[pos]!;
  const n = runLength(src, pos);
  const run = push(st, src.slice(pos, pos + n), n);
  if (ch === '~' && n !== 2) return;
  const before = around(src, pos)[0], after = around(src, pos + n)[1];
  const bWs = WS.test(before), aWs = WS.test(after), bP = PUNCT.test(before), aP = PUNCT.test(after);
  const left = !aWs && (!aP || bWs || bP), right = !bWs && (!bP || aWs || aP);
  const canOpen = ch === '_' ? left && (!right || bP) : left, canClose = ch === '_' ? right && (!left || aP) : right;
  const d: Delim = { run, ch, len: n, left: n, canOpen, canClose, prev: st.delims, next: null };
  if (st.delims) st.delims.next = d;
  st.delims = d;
}

function openBracket(st: State, image: boolean): void {
  const start = st.pos;
  const run = push(st, image ? '![' : '[', image ? 2 : 1);
  st.brackets = { run, image, start, delim: st.delims, active: true, prev: st.brackets };
}

/** `]`: a link or an image if `(…)` follows the top open bracket, else plain text. */
function closeBracket(st: State): void {
  const b = st.brackets;
  const target = b?.active ? inlineLink(st.src, st.pos + 1) : null;
  if (!b || !target) {
    if (b) st.brackets = b.prev;
    push(st, ']', 1);
    return;
  }
  processEmphasis(st, b.delim);
  // An image is outside the subset: its source shows as text.
  const html = b.image ? esc(st.src.slice(b.start, target.end)) : link(target.url, target.title, flatten(b.run.next, null));
  Object.assign(b.run, { s: html, html: true, next: null });
  st.tail = b.run;
  st.brackets = b.prev;
  st.pos = target.end;
  // No links inside links: earlier `[` openers can no longer form one (images may still contain links).
  if (!b.image) for (let x = st.brackets; x; x = x.prev) { if (!x.image && !x.active) break; if (!x.image) x.active = false; }
}

/** `<scheme:…>` or `<a@b.c>`; anything else after `<` is text (raw HTML is not in the subset). */
function autolink(st: State): void {
  for (const [re, prefix] of [[URI, ''], [EMAIL, 'mailto:']] as const) {
    re.lastIndex = st.pos + 1;
    const m = re.exec(st.src);
    if (!m) continue;
    const text = m[0].slice(0, -1);
    push(st, link(prefix + text, undefined, esc(text)), m[0].length + 1, true);
    return;
  }
  push(st, '<', 1);
}

/** A line ending: hard after a backslash or two spaces, soft otherwise; spaces around it are dropped. */
function lineEnd(st: State, backslash: boolean): void {
  let hard = backslash;
  const last = st.tail;
  if (!backslash && last && !last.html) {
    let k = last.s.length;
    while (last.s[k - 1] === ' ') k -= 1;
    [hard, last.s] = [last.s.length - k >= 2, last.s.slice(0, k)];
  }
  push(st, hard ? '<br />\n' : '\n', backslash ? 2 : 1, true);
  while (st.src[st.pos] === ' ') st.pos += 1;
}

function backslash(st: State): void {
  const next = st.src[st.pos + 1];
  if (next === '\n') { lineEnd(st, true); return; }
  const escaped = next !== undefined && ASCII_PUNCT.test(next);
  push(st, escaped ? next : '\\', escaped ? 2 : 1);
}

/** Plain text up to the next character that may start markup. */
function text(st: State): void {
  SPECIAL.lastIndex = st.pos + 1;
  const end = SPECIAL.exec(st.src)?.index ?? st.src.length;
  push(st, st.src.slice(st.pos, end), end - st.pos);
}

function step(st: State): void {
  switch (st.src[st.pos]) {
    case '\\': return backslash(st);
    case '`': return codeSpan(st);
    case '*': case '_': case '~': return delimRun(st);
    case '[': return openBracket(st, false);
    case '!': return st.src[st.pos + 1] === '[' ? openBracket(st, true) : text(st);
    case ']': return closeBracket(st);
    case '<': return autolink(st);
    case '\n': return lineEnd(st, false);
    default: return text(st);
  }
}

/** Inline Markdown to HTML. `src` is a block's text, trimmed; the result is safe to set as innerHTML. */
export function renderInline(src: string): string {
  const st: State = { src, pos: 0, head: null, tail: null, delims: null, brackets: null, ticks: null, tickAt: new Map() };
  while (st.pos < src.length) step(st);
  processEmphasis(st, null);
  return flatten(st.head, null);
}
