// The project's `.env` for an app's tools (D-047 ruling 8, rule 19): read when the app's process
// starts, and only the keys the manifest's `env` names are given; nothing else from the board's
// environment reaches the app. A small parser, no dependency: `KEY=value` lines, an optional
// `export `, comments (`#` at the start of a line, or after a space in an unquoted value), single
// quotes (taken as they are) and double quotes (with `\n`, `\"` and `\\`). The last line for a key wins.
import fs from 'node:fs';
import path from 'node:path';

const LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/;
const DOUBLE = /^"((?:[^"\\]|\\.)*)"/;
const SINGLE = /^'([^']*)'/;

/** The value part of a line: quoted, or bare up to a ` #` comment. */
function valueOf(raw: string): string {
  const double = DOUBLE.exec(raw);
  if (double) return double[1]!.replace(/\\(.)/g, (_, c: string) => (c === 'n' ? '\n' : c));
  const single = SINGLE.exec(raw);
  if (single) return single[1]!;
  return raw.replace(/\s+#.*$/, '').trim();
}

/** Every `KEY=value` line of `.env` text. */
export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(#|$)/.test(line)) continue;
    const m = LINE.exec(line);
    if (m) out[m[1]!] = valueOf(m[2]!);
  }
  return out;
}

/** The declared `keys` that the project's `.env` sets; nothing when it has none. */
export function readEnv(project: string, keys: readonly string[]): Record<string, string> {
  let text: string;
  try { text = fs.readFileSync(path.join(project, '.env'), 'utf8'); } catch { return {}; }
  const all = parseEnv(text);
  return Object.fromEntries(keys.filter((k) => Object.hasOwn(all, k)).map((k) => [k, all[k]!]));
}
