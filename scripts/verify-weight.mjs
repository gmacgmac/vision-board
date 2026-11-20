// Rule 15: the board page's weight, from the last `npm run build` (docs/specification/performance.md
// § Budgets). Split out of verify.mjs (ARCH_06); verify.mjs re-exports it for verify.test.mjs.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const fail = (file, message) => ({ level: 'fail', file, message });
const warn = (file, message) => ({ level: 'warn', file, message });

/** Rule 15: the board page's JS and CSS, gzipped (docs/specification/performance.md § Budgets). */
export const PAGE = { html: 'apps/board/dist/index.html', budgetKb: 214.8 } // 200 (D-049); 214.8 since the holders chip (Access Clarity T_03, measured 214.7; maintainer point 718); 214.6 since the opening fit follows a font that loads late (boards.ts `relaid`, measured 214.54); 214.5 since the disc and body text, D-112 (measured 214.4); 214.2 since printed labels fit their gap (measured 214.1); 213.7 since print through the host (measured 213.6); 213.4 since the link labels and folders (measured 213.3); 212.4 since the folder chooser (D-110, measured 212.3); 212.2 since the print grip (point 633: the grip icon in the grip); 212.1 since files FIX_01 (measured 212.0); 211.2 files wave 2; 206.2 since timeline FIX_04 (measured 206.19: the dots' own group above the links); 206.1 since timeline FIX_02 (measured 206.01: a dated card's date in its name, no selection on a bare press); 206.0 since timeline FE_02 run 2 (measured 205.9: the line's glide groups; run 1 205.4: the line on the board, the gate, the gallery's board section); 204.6 since timeline wave 2 (measured 204.5; T_01 201.5); 201.3 since FIX_06 (open corners measured 201.2; 201.1 before it) and the Node Overhaul's T_04 removed the old node (measured 201.0; was 211.2 while both shipped): the new node's marks, menus and skins outweigh the footer they replaced; back to 200 is a tracker row.

/** The board page's assets at start: what its HTML loads from /assets/, and every file those import
 * statically. A chunk reached only through `import()` is not loaded at start (the chat panel's drawing,
 * board/chat-view.ts), so it is not counted. `read(name)` gives an asset's text, or null. */
export function pageAssets(html, read) {
  const seen = new Set();
  // Any name the bundler gives (a group's chunk may hold `~` or `$`), up to the quote that closes it.
  const queue = [...html.matchAll(/(?:src|href)="\/assets\/([^"/]+\.(?:js|css))"/g)].map((m) => m[1]);
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    if (name.endsWith('.js')) for (const m of (read(name) ?? '').matchAll(/(?:\bfrom|\bimport)\s*["']\.\/([^"'/]+\.(?:js|css))["']/g)) queue.push(m[1]);
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
