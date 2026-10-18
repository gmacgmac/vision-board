// Shared by the Markdown safety tests and their timing test (N12_FE_01 ruling 7: timing tests run
// alone, in their own serial step): the shape every link and every image must have (an image only
// under the board's image route, D-048 ruling 19), the check that output holds only allowed tags, and
// the adversarial inputs.
import assert from 'node:assert/strict';

export const LINK_SHAPE = '<a class="vb-md-link" href="[^"<>]*"(?: title="[^"<>]*")? rel="noopener noreferrer" target="_blank">';
export const LINK = new RegExp(LINK_SHAPE);
export const LINKS = new RegExp(LINK_SHAPE, 'g');
/** The one image shape (app-cards FE_03): a path of plain names under the image route, escaped alt text. */
export const IMG_SHAPE = '<img class="vb-md-img" src="/board-images/[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*" alt="[^"<>]*" loading="lazy" decoding="async">';
export const IMG = new RegExp(IMG_SHAPE);
export const IMGS = new RegExp(IMG_SHAPE, 'g');

/** Every tag in the output is one the renderer is allowed to write, and every <a> and <img> has its
 * fixed shape. */
export function assertSafe(html: string): void {
  const tags = [...html.matchAll(/<\/?([a-z0-9]+)/g)].map((m) => m[1]);
  const allowed = new Set(['p', 'span', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'strong', 'em', 'del', 'br', 'img']);
  for (const t of tags) assert.ok(allowed.has(t!), `unexpected tag <${t}> in ${html}`);
  assert.equal((html.match(/<a /g) ?? []).length, (html.match(LINKS) ?? []).length, `link shape in ${html}`);
  assert.equal((html.match(/<img/g) ?? []).length, (html.match(IMGS) ?? []).length, `image shape in ${html}`);
  assert.doesNotMatch(html, /style=|<script|<iframe|<svg/i);
  // A refused URL may show as text, but never inside a tag (an image's alt is text, never a URL).
  assert.doesNotMatch(html.replace(/ alt="[^"]*"/g, ''), /<[^>]*(?:javascript:|data:|vbscript:)/i);
}

/** Adversarial inputs for backtracking and quadratic scans, each at or near the 20,000 cap. */
export const ADVERSARIAL: Record<string, string> = {
  'stars': '*'.repeat(20_000),
  'brackets': '['.repeat(20_000),
  'backticks': '`'.repeat(20_000),
  'stars, brackets, backticks (x 10,000 each, cut at 20,000)': '*'.repeat(10_000) + '['.repeat(10_000) + '`'.repeat(10_000),
  'star-a pairs': '*a'.repeat(10_000),
  'underscore-a pairs': '_a'.repeat(10_000),
  'tilde pairs': '~~a'.repeat(6_666),
  'bracket-a pairs': '[a'.repeat(10_000),
  'open link targets': '[a]('.repeat(5_000),
  'backtick runs of growing length': Array.from({ length: 190 }, (_, i) => `${'`'.repeat(i + 1)}a`).join(''),
  'angle brackets': '<'.repeat(20_000),
  'autolink starts': '<a:'.repeat(6_666),
  'backslashes': '\\'.repeat(20_000),
  'image starts': '!['.repeat(10_000),
  'images': '![a](a.png)'.repeat(1_800),
  'image targets with tricks': '![a](../a.png) ![b](%2e.png) ![c](javascript:x) '.repeat(400),
  'nested image starts': '![!['.repeat(5_000),
  'nested quotes': '>'.repeat(20_000),
  'nested lists': '- '.repeat(10_000),
  'many lines': 'a\n'.repeat(10_000),
  'many list items': '- a\n'.repeat(5_000),
  'trailing hashes': `# ${'# '.repeat(9_998)}`,
  'spaces then hashes': `# a${' '.repeat(10_000)}${'#'.repeat(9_990)}x`,
};
