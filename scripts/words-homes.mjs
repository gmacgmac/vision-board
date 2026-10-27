// Where the words live (cortex-architecture rule 7; docs/specification/words.md is the list for
// people, this file is the list for the test, and words.test.mjs holds the two equal).
// A part is a piece of the code that sends text; its roots are scanned for a sentence outside
// its words folder. Add a part here and in the doc in the same change.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { scanFile } from './words-scan.mjs';

/** Parts that send text, each with one words folder. The board is hostable, so its words live inside
 * `board/` and import nothing of the standalone page; the shell (the page around it) has its own.
 * Parts of a group may import each other's words (shell reads board's); a sentence is said once per group. */
export const PARTS = [
  { part: 'board', group: 'page', roots: ['apps/board/src/board', 'apps/board/src/main.ts', 'apps/board/src/flags.ts'], words: 'apps/board/src/board/words' },
  { part: 'shell', group: 'page', roots: ['apps/board/src/shell'], words: 'apps/board/src/shell/words' },
  { part: 'format', group: 'format', roots: ['packages/format/src'], words: 'packages/format/src/words' },
  { part: 'actions', group: 'actions', roots: ['packages/actions/src'], words: 'packages/actions/src/words' },
  { part: 'ui', group: 'ui', roots: ['packages/ui/src'], words: 'packages/ui/src/words' },
  { part: 'server', group: 'server', roots: ['apps/board/server', 'apps/board/server.ts', 'apps/board/bin'], words: 'apps/board/server/words' },
  { part: 'mcp', group: 'mcp', roots: ['packages/mcp/src', 'packages/mcp/bin'], words: 'packages/mcp/src/words' },
  { part: 'cli', group: 'cli', roots: ['packages/cli/src', 'packages/cli/bin'], words: 'packages/cli/src/words' },
];

/** Homes that are not a words folder, each with the reason it cannot import one. */
export const OTHER_HOMES = [
  { path: 'packages/format/schema/openapi.json', why: 'Tool, parameter and route descriptions are one source (D-056); the MCP tools and the vb commands are generated from it.' },
  { path: 'packages/format/schema/ledger-event.schema.json', why: 'Field descriptions the OpenAPI source refers to; JSON cannot import.' },
  { path: 'skills/vision-board/SKILL.md', why: 'The agent\'s instructions are a Markdown file the agent\'s client loads; it cannot import.' },
  { path: 'apps/board/server/apps/runner.mjs', why: 'An app\'s tools run in a child under Node\'s permission model that may read only the app\'s folder and this file, so it cannot import; it tells the supervisor what failed, which tells the agent.' },
  { path: 'packages/format/src/images.ts', why: 'A pure file that imports nothing (images-pure.test.ts: the page and the server both run it); its reasons are the one `IMAGE_WORDS` object, with that test.' },
  { path: 'apps/board/index.html', why: 'A static page: its title is read before any script runs.' },
  { path: 'packages/actions/src/answers/remove-words.ts', why: 'Already a words file with its logic (the Remove confirm) and its own test; it stays where its pure code is.' },
];

/** Roots not scanned yet, with why. A part moves out of this list when it is clean. */
export const NOT_SCANNED = [
  { path: 'packages/chat/src', why: 'The chat package is replaced by nclite\'s chat (PLAN Out of Scope).' },
  { path: 'packages/agent/src', why: 'Agent adapters: protocol and process lines for developers, not a screen.' },
  { path: 'apps/board/src/gallery', why: 'The gallery is a developer page: its text is sample board content and captions for the maintainer.' },
];

/** Text only a developer reads, so it stays in code and is not scanned (words.md § What stays in code). */
export const DEVELOPER_TEXT = [
  { path: 'packages/format/src/flags.ts', why: 'What each feature flag switches: read in the source and in the gallery\'s flag list, by the maintainer.' },
  { path: 'packages/actions/src/conditions.ts', why: 'When each condition is true and when it ends (`trueWhen`, `endsWhen`): documentation of the registry, not shown to the person or sent to an agent.' },
  { path: 'packages/actions/src/references.ts', why: 'What each reference edge means (`REFERENCES`): documentation of the registry, not shown or sent.' },
];

/** Generated code the scan skips: its text comes from the OpenAPI source. */
export const GENERATED = /\.generated\.(?:ts|json)$/;

/** One literal at a time, with its reason: not a sentence anyone reads. */
export const EXEMPT = [
  { file: 'apps/board/src/board/history-flow.ts', text: 'Home', why: 'a keyboard key name (KeyboardEvent.key)' },
  { file: 'apps/board/src/board/history-flow.ts', text: 'End', why: 'a keyboard key name (KeyboardEvent.key)' },
  { file: 'packages/ui/src/base/menu-core.ts', text: 'Escape', why: 'a keyboard key name (KeyboardEvent.key)' },
  { file: 'apps/board/server/chat-access.ts', text: 'Read', why: 'a tool name the agent client knows (an id, not a sentence)' },
  { file: 'apps/board/server/chat-access.ts', text: 'Glob', why: 'a tool name the agent client knows (an id, not a sentence)' },
  { file: 'apps/board/server/chat-access.ts', text: 'Grep', why: 'a tool name the agent client knows (an id, not a sentence)' },
  { file: 'apps/board/server/folders.ts', text: 'Library', why: 'the name of a macOS folder (a path part, not a sentence)' },
];

const SOURCE = /\.(?:ts|svelte)$/;
const SKIPPED = new Set([...DEVELOPER_TEXT, ...OTHER_HOMES].map((h) => h.path));

/** Every source file under a root (a file or a folder), skipping tests, generated code and words folders. */
export function sourcesOf(root, base = '.') {
  const abs = path.join(base, root);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isFile()) return SOURCE.test(root) && !GENERATED.test(root) && !SKIPPED.has(root) ? [root] : [];
  return readdirSync(abs).flatMap((name) => {
    const rel = `${root}/${name}`;
    if (statSync(path.join(base, rel)).isDirectory()) return ['node_modules', 'dist', 'tests', 'words', 'fixtures'].includes(name) ? [] : sourcesOf(rel, base);
    return SOURCE.test(name) && !GENERATED.test(name) && !name.endsWith('.d.ts') && !SKIPPED.has(rel) ? [rel] : [];
  });
}

/** Sentences outside the words folders, as `file:line "text"`; an exemption that matches nothing is reported too. */
export function sentencesOutside(base = '.') {
  const left = [];
  const used = new Set();
  const skipped = (f) => NOT_SCANNED.some((n) => f.startsWith(`${n.path}/`));
  for (const { roots } of PARTS) {
    for (const file of roots.flatMap((r) => sourcesOf(r, base)).filter((f) => !skipped(f))) {
      for (const g of scanFile(file, readFileSync(path.join(base, file), 'utf8'))) {
        const ex = EXEMPT.findIndex((e) => e.file === file && e.text === g.text);
        if (ex >= 0) used.add(ex); else left.push(`${file}:${g.line} ${JSON.stringify(g.text.slice(0, 80))}`);
      }
    }
  }
  EXEMPT.forEach((e, i) => { if (!used.has(i)) left.push(`exemption names a literal that is gone: ${e.file} ${JSON.stringify(e.text)}`); });
  return left;
}
