// The plugin's manifest (`manifest.json`, checked by manifest.schema.json): what a host reads before it loads anything.
// Its tools are the engine's `tools.list()` (so a host that checks the engine against the manifest finds no
// difference), its chips the kinds `#actions` resolves, its text only keys into words.json; `changeWords`, the keys a
// board write's change line may name (`CHANGE_WORDS`, the engine's one home of them).
import type { ChipKind } from '#actions';
import { CHIP_PLUGIN } from '#actions';
import type { ListedTool } from '#mcp';
import { CHANGE_WORDS } from '../server/engine/index.ts';
import { SEAM } from './seam.ts';

/** Every chip kind, once: the type makes a new kind in `ChipKind` stop this file until it is listed. */
const CHIPS = { card: 1, note: 1, board: 1, selection: 1, answers: 1 } satisfies Record<ChipKind, 1>;

/** Where the build puts each part, relative to the folder. */
export const PARTS = { view: 'view/board.js', styles: 'view/board.css', engine: 'engine/engine.js', words: 'words.json', skill: 'skill.md' } as const;

/** The key of a tool's description in words.json. */
export const toolKey = (name: string): string => `board.tool.${name}`;

export function manifestOf(version: string, tools: readonly ListedTool[], writes: ReadonlySet<string>) {
  return {
    id: CHIP_PLUGIN, name: 'board.plugin.name', version, seam: SEAM,
    view: { module: PARTS.view, styles: [PARTS.styles], export: 'mount' },
    engine: { module: PARTS.engine, export: 'createEngine' },
    chips: (Object.keys(CHIPS) as ChipKind[]).map((kind) => ({ kind, words: `board.plugin.chips.${kind}` })),
    tools: tools.map((t) => ({ name: t.name, words: toolKey(t.name), input: t.inputSchema, writes: writes.has(t.name) })),
    skill: PARTS.skill, words: PARTS.words,
    changeWords: Object.values(CHANGE_WORDS),
  };
}
