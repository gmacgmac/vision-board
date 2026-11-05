// Markdown, the leaf blocks a line can open by its first characters (CommonMark): an ATX heading and,
// with markdownMore, a thematic break. Pure scanners over one line from a column; blocks.ts calls them.

/** `#` to `######` and the text, without a closing run of `#`s. */
export function atx(s: string, i: number): { level: number; text: string } | null {
  let n = 0;
  while (s[i + n] === '#') n += 1;
  if (n > 6 || (i + n < s.length && s[i + n] !== ' ')) return null;
  const a = i + n;
  let b = s.length;
  while (b > a && s[b - 1] === ' ') b -= 1;
  let c = b;
  while (c > a && s[c - 1] === '#') c -= 1;
  if (c < b && (c === a || s[c - 1] === ' ')) b = c;
  return { level: n, text: s.slice(a, b).trim() };
}

/** Three or more of one of `-*_`, spaces between allowed, nothing else on the line (CommonMark). */
export function thematicBreak(s: string, i: number): boolean {
  const c = s[i];
  if (c !== '-' && c !== '*' && c !== '_') return false;
  let n = 0;
  for (let k = i; k < s.length; k += 1) {
    if (s[k] === c) n += 1;
    else if (s[k] !== ' ') return false;
  }
  return n >= 3;
}
