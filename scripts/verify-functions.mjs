// Rule 2, functions (D-016, ARCH_06): a function runs about 50 lines. A closure factory's inner
// functions count on their own, so a long one cannot hide inside a short-looking factory, and a
// factory counts only the lines that are its own (its inner functions' bodies are left out).
// Blank lines do not count. A function that must run long says why in its header:
// `verify: long-function <reason>`.
// Zero dependencies (D-016): a small scanner over the text, not a parser. It masks comments,
// strings, regular expressions and template text, then pairs the braces and keeps those that open a
// function body (`=>`, `function`, a method). Pure over strings, proved in verify-functions.test.mjs.

export const FUNCTION_LIMIT = 50;
const LONG_FUNCTION = /verify: long-function[ \t]+(\S[^\n]*)/;
const NOT_FUNCTIONS = new Set(['if', 'for', 'while', 'switch', 'catch', 'with', 'return', 'typeof', 'await', 'in', 'of']);
const REGEX_AFTER = /[(,=:[!&|?{};+\-*%<>~^]$|(?:^|[^\w$.])(?:return|typeof|case|of|in|void|delete|throw|yield|await)$/;

/** The text with comments, string and template text, and regular expressions blanked (same length,
 * same newlines); `${ ... }` inside a template stays code. */
export function mask(text) {
  const out = text.split('');
  const blank = (from, to) => { for (let k = from; k < to; k++) if (out[k] !== '\n') out[k] = ' '; };
  const templates = []; // brace depth at which each open `${` returns to its template
  let depth = 0;
  let i = 0;
  const scanTemplate = () => { // at i, inside template text; stops after the closing backtick or at `${`
    const start = i;
    while (i < text.length) {
      if (text[i] === '\\') i += 2;
      else if (text[i] === '`') { blank(start, i); i++; return false; }
      else if (text[i] === '$' && text[i + 1] === '{') { blank(start, i); i += 2; templates.push(depth++); return true; }
      else i++;
    }
    blank(start, i);
    return false;
  };
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '/' && n === '/') { const e = text.indexOf('\n', i); const to = e < 0 ? text.length : e; blank(i, to); i = to; }
    else if (c === '/' && n === '*') { const e = text.indexOf('*/', i + 2); const to = e < 0 ? text.length : e + 2; blank(i, to); i = to; }
    else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== c && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1;
      blank(i + 1, j); i = j + 1;
    } else if (c === '`') { i++; scanTemplate(); }
    else if (c === '/') {
      const before = text.slice(Math.max(0, i - 12), i).replace(/\s+$/, '');
      if (before === '' || REGEX_AFTER.test(before)) {
        let j = i + 1;
        let inClass = false;
        while (j < text.length && text[j] !== '\n' && (inClass || text[j] !== '/')) {
          if (text[j] === '\\') j++;
          else if (text[j] === '[') inClass = true;
          else if (text[j] === ']') inClass = false;
          j++;
        }
        blank(i + 1, j); i = j + 1;
      } else i++;
    } else if (c === '{') { depth++; i++; }
    else if (c === '}') {
      depth--; i++;
      if (templates.length && templates[templates.length - 1] === depth) { templates.pop(); scanTemplate(); }
    } else i++;
  }
  return out.join('');
}

/** The index of the `(` that matches the `)` at `close`, or -1. */
function openParen(masked, close) {
  let d = 0;
  for (let k = close; k >= 0; k--) {
    if (masked[k] === ')') d++;
    else if (masked[k] === '(' && --d === 0) return k;
  }
  return -1;
}

/** What the `{` at `at` opens, if a function body: { name } or null. */
function functionHead(masked, at) {
  const before = masked.slice(Math.max(0, at - 400), at);
  if (/=>\s*$/.test(before)) {
    const line = before.slice(before.lastIndexOf('\n') + 1);
    const m = /^\s*(?:export\s+)?(?:(?:const|let|var)\s+(\w+)|(\w+)\s*:|(\w+)\s*=(?!=))/.exec(line);
    return { name: m?.[1] ?? m?.[2] ?? m?.[3] ?? '(anonymous)' };
  }
  const m = /\)\s*(?::\s*[^{};=()]+)?\s*$/.exec(before);
  if (!m) return null;
  const close = at - before.length + m.index;
  const open = openParen(masked, close);
  if (open < 0) return null;
  const head = /(?:function\s*\*?\s*(\w*)|(?:^|[^\w$.])(?:(?:async|static|get|set)\s+)*(\w+))\s*(?:<[^()]*>)?\s*$/.exec(masked.slice(Math.max(0, open - 80), open));
  const name = head?.[1] || head?.[2];
  if (!head || (!head[1] && (!name || NOT_FUNCTIONS.has(name)))) return head && /function/.test(head[0]) ? { name: '(anonymous)' } : null;
  return { name: name || '(anonymous)' };
}

/** Every function body in `text`: { name, line, end, lines, own }. `lines` is the whole body;
 * `own` leaves out the bodies of the functions inside it. */
export function functionsOf(text) {
  const masked = mask(text);
  const lineAt = [0];
  for (let k = 0; k < masked.length; k++) if (masked[k] === '\n') lineAt.push(k + 1);
  const lineOf = (pos) => { let lo = 0; let hi = lineAt.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineAt[mid] <= pos) lo = mid; else hi = mid - 1; } return lo + 1; };
  // code[i]: the lines up to and including line i that are not blank (a prefix count)
  const code = [0];
  text.split('\n').forEach((l, i) => code.push(code[i] + (l.trim() === '' ? 0 : 1)));
  const countLines = (from, to) => code[to] - code[from - 1];
  const stack = [];
  const found = [];
  for (let k = 0; k < masked.length; k++) {
    if (masked[k] === '{') stack.push({ at: k, head: functionHead(masked, k), inner: 0 });
    else if (masked[k] === '}') {
      const top = stack.pop();
      if (!top?.head) continue;
      const line = lineOf(top.at);
      const end = lineOf(k);
      const lines = countLines(line, end);
      found.push({ name: top.head.name, line, end, lines, own: lines - top.inner });
      const parent = [...stack].reverse().find((s) => s.head);
      if (parent) parent.inner += lines;
    }
  }
  return found.sort((a, b) => a.line - b.line);
}

/** The reason a function says why it runs long, from its signature line or the comment just above. */
function reasonFor(lines, line) {
  const header = [lines[line - 1]];
  for (let k = line - 2; k >= 0 && /^\s*(?:\/\/|\/\*|\*)/.test(lines[k]); k--) header.push(lines[k]);
  return LONG_FUNCTION.exec(header.join('\n'))?.[1].replace(/\s*\*\/\s*$/, '').trim();
}

const TEST_FILE = /(?:\.test\.|\.spec\.|\.generated\.|(?:^|\/)tests\/)/;

/** Rule 2 for functions: warn over about 50 lines of a function's own, with its reason if it gives one. */
export function checkFunctionLength(file, text, limit = FUNCTION_LIMIT) {
  if (!/\.(?:ts|mjs|js)$/.test(file) || TEST_FILE.test(file)) return [];
  const lines = text.split('\n');
  return functionsOf(text).filter((f) => f.own > limit).map((f) => ({
    level: 'warn',
    file,
    message: `${f.name} (line ${f.line}) runs ${f.own} lines (aim for about ${limit}): split it at a seam${(() => { const r = reasonFor(lines, f.line); return r ? ` (long-function: ${r})` : ''; })()}`,
  }));
}
