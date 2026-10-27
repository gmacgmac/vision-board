// Rule 15: the board page's weight, from the last `npm run build` (docs/specification/performance.md
// § Budgets). Split out of verify.mjs (ARCH_06); verify.mjs re-exports it for verify.test.mjs.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const fail = (file, message) => ({ level: 'fail', file, message });
const warn = (file, message) => ({ level: 'warn', file, message });

/** Rule 15: the board page's JS and CSS, gzipped (docs/specification/performance.md § Budgets). */
export const PAGE = { html: 'apps/board/dist/index.html', budgetKb: 200 };

/** The board page's assets at start: what its HTML loads from /assets/, and every file those import
 * statically. A chunk reached only through `import()` is not loaded at start (the chat panel's drawing,
 * board/chat-view.ts), so it is not counted. `read(name)` gives an asset's text, or null. */
export function pageAssets(html, read) {
  const seen = new Set();
  const queue = [...html.matchAll(/(?:src|href)="\/assets\/([\w.-]+\.(?:js|css))"/g)].map((m) => m[1]);
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    if (name.endsWith('.js')) for (const m of (read(name) ?? '').matchAll(/(?:\bfrom|\bimport)\s*["']\.\/([\w.-]+\.(?:js|css))["']/g)) queue.push(m[1]);
  }
  return [...seen];
}

/** Rule 15: the page's gzipped weight against its budget. */
export function checkWeight(file, gzipBytes, budgetKb) {
  if (gzipBytes <= budgetKb * 1024) return [];
  return [fail(file, `the board page is ${(gzipBytes / 1024).toFixed(1)} KB gzip (JS + CSS), budget ${budgetKb} KB (docs/specification/performance.md)`)];
}

/** The built board page's gzipped weight in bytes, or null when it has not been built. */
export function pageWeight(root) {
  const html = path.join(root, PAGE.html);
  if (!existsSync(html)) return null;
  const dir = path.join(path.dirname(html), 'assets');
  const read = (name) => (existsSync(path.join(dir, name)) ? readFileSync(path.join(dir, name), 'utf8') : null);
  return pageAssets(readFileSync(html, 'utf8'), read)
    .reduce((sum, name) => sum + gzipSync(readFileSync(path.join(dir, name))).length, 0);
}

export function weightOf(root) {
  const bytes = pageWeight(root);
  if (bytes === null) return [warn(PAGE.html, 'not built, so the page weight was not checked: run npm run build')];
  return checkWeight(PAGE.html, bytes, PAGE.budgetKb);
}
