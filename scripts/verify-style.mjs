// The style and layer rules verify.mjs runs (UI_01; docs/principles.md § Design tokens, § Dependencies,
// § The board is a plugin): colour literals live only in packages/tokens; network calls and file,
// socket and process access only in their layers; every rule in the board's stylesheets names a
// vb- class or element (so it reaches nothing in a host's page) and sizes by the board's own width.
// Each check is a pure function over one file's path and text; verify-style.test.mjs proves them.

const fail = (file, message) => ({ level: 'fail', file, message });
const warn = (file, message) => ({ level: 'warn', file, message });

const STYLED = /\.(?:css|ts|mjs|js|svelte|html)$/;
const CODE = /\.(?:ts|mjs|js|svelte)$/;
/** Source a rule holds for: the apps and packages, not their tests. */
const inSource = (rel) => /^(?:apps|packages)\//.test(rel) && !/\/tests?\//.test(rel);

/** Comments out, so a citation of an old value never counts. */
const uncomment = (text, css) => {
  const blocks = text.replace(/\/\*[\s\S]*?\*\//g, '');
  return css ? blocks : blocks.replace(/(^|[\s;{}(])\/\/.*$/gm, '$1');
};

// ---- Colours -------------------------------------------------------------------------------------

/** Where colour literals may be: the tokens. */
const TOKENS = 'packages/tokens/';
/** Out of scope, warned once per file: the chat's own palette (review §8; PLAN § Out of Scope). */
const COLOUR_EXEMPT = [{ path: 'packages/chat/', why: "the chat's own palette (review §8), out of scope (PLAN)" }];
const NAMED = 'white|black|red|green|blue|yellow|orange|purple|gray|grey|silver|pink|navy|teal|maroon';
/** A colour function with literal channels (a relative colour, `oklch(from var(--x) …)`, is not one). */
const FUNC = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(\s*(?!from\b)(?:[\d.]|srgb|display-p3)/i;
const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i;
/** In code, a hex only counts where it is a value: after `:`, `=` with a quote, or `(`/`,` in a colour. */
const HEX_IN_CODE = /(?::\s*|=\s*['"]|[(,]\s*)#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i;
const NAMED_VALUE = new RegExp(`:\\s*(?:${NAMED})\\s*[;}"']`, 'i');

/** A colour literal outside the tokens fails (docs/principles.md § Design tokens). */
export function checkColours(rel, text) {
  if (!STYLED.test(rel) || !inSource(rel) || rel.startsWith(TOKENS)) return [];
  const css = rel.endsWith('.css');
  const src = uncomment(text, css);
  const lines = src.split('\n').filter((l) => FUNC.test(l) || (css ? HEX : HEX_IN_CODE).test(l) || NAMED_VALUE.test(l));
  if (!lines.length) return [];
  const exempt = COLOUR_EXEMPT.find((e) => rel.startsWith(e.path));
  if (exempt) return [warn(rel, `${lines.length} colour literal line(s): ${exempt.why}`)];
  return [fail(rel, `a colour literal outside the tokens: "${lines[0].trim().slice(0, 80)}" (use a --vb- token)`)];
}

// ---- I/O layers ----------------------------------------------------------------------------------

/** The page's network calls: only the board's I/O layer and the typed client make them. */
const NETWORK = /\bfetch\s*\(|\bnew\s+(?:EventSource|WebSocket)\s*\(|\bXMLHttpRequest\b|\bsendBeacon\s*\(/;
/** File, socket and process access (a type import is not access). */
const NODE_IO = /(?:^|\n)\s*import\s+(?!type\b)[^'"]*from\s*['"]node:(?:fs|fs\/promises|http|https|http2|net|tls|dgram|child_process|worker_threads)['"]|\bimport\(\s*['"]node:(?:fs|fs\/promises|http|https|http2|net|tls|dgram|child_process|worker_threads)['"]\s*\)/;
/** The Node-side layers: the board's server and bins, the agent runner, the MCP server, the CLI's I/O file and bins. */
const NODE_LAYERS = ['apps/board/server/', 'apps/board/server.ts', 'apps/board/bin/', 'packages/agent/', 'packages/mcp/',
  'packages/cli/src/node-io.ts', 'packages/cli/bin/'];
const NETWORK_LAYERS = ['apps/board/src/board/io.ts', 'packages/client/src/', ...NODE_LAYERS];
const within = (rel, layers) => layers.some((l) => rel === l || (l.endsWith('/') && rel.startsWith(l)));

/** Network, file, socket or process access outside its layer fails (one I/O layer, docs/principles.md). */
export function checkIO(rel, text) {
  if (!CODE.test(rel) || !inSource(rel)) return [];
  const src = uncomment(text, false);
  const out = [];
  if (NETWORK.test(src) && !within(rel, NETWORK_LAYERS)) out.push(fail(rel, 'a network call outside the I/O layer (apps/board/src/board/io.ts, #client)'));
  if (NODE_IO.test(src) && !within(rel, NODE_LAYERS)) out.push(fail(rel, `file, socket or process access outside the Node-side layers (${NODE_LAYERS.join(', ')})`));
  return out;
}

// ---- Scoped styles -------------------------------------------------------------------------------

/** The board's stylesheets: the patterns' and the app's. */
const BOARD_SHEETS = /^(?:packages\/ui\/src\/|apps\/board\/src\/styles\/).*\.css$/;
/** The standalone page's own sheets, which may style the page (a host brings its own). */
const STANDALONE = ['apps/board/src/styles/shell.css', 'apps/board/src/styles/chat-host.css'];
/** A selector that names a vb- class, a vb- element or a vb- class attribute. */
const SCOPED = /\.vb-|(?:^|[\s>+~(,])vb-[a-z]|\[class[*~^|]?=\s*['"]?vb-/;
const WINDOW_WIDTH = /\((?:min-|max-)?width\s*[:<>=]|\(\s*[\d.]+\w*\s*[<>]=?\s*width/;
const splitTop = (list) => list.split(/,(?![^(]*\))/).map((s) => s.trim()).filter(Boolean);

/** Every rule in a board stylesheet names a vb- class or element, and no rule sizes by the window. */
export function checkScope(rel, text) {
  if (!BOARD_SHEETS.test(rel) || STANDALONE.includes(rel)) return [];
  const css = uncomment(text, true);
  const out = [];
  // The blocks open now: 'group' (@media, @container, @supports, @layer), 'skip' (@keyframes,
  // @font-face, @property: no selectors inside), 'rule'.
  const stack = [];
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '}') { stack.pop(); start = i + 1; continue; }
    if (c === ';') { start = i + 1; continue; }
    if (c !== '{') continue;
    const prelude = css.slice(start, i).trim();
    start = i + 1;
    if (stack.includes('skip') || stack.at(-1) === 'rule') { stack.push('skip'); continue; }
    if (prelude.startsWith('@')) {
      const name = /^@([\w-]+)/.exec(prelude)?.[1] ?? '';
      if (name === 'media' && WINDOW_WIDTH.test(prelude)) out.push(fail(rel, `${prelude}: size by the board's own width (@container), not the window's`));
      if (name === 'property' && !/^@property\s+--vb-/.test(prelude)) out.push(fail(rel, `${prelude}: a registered property is named --vb-`));
      stack.push(['media', 'container', 'supports', 'layer'].includes(name) ? 'group' : 'skip');
      continue;
    }
    for (const sel of splitTop(prelude)) {
      if (!SCOPED.test(sel)) out.push(fail(rel, `"${sel}" reaches outside the board: name a vb- class or element (rules for the page go in the standalone page's shell.css)`));
    }
    stack.push('rule');
  }
  return out;
}

/** All three, for one file. */
export const checkStyleAndLayers = (rel, text) => [...checkColours(rel, text), ...checkIO(rel, text), ...checkScope(rel, text)];
