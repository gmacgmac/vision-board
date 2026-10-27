// The board page's view commands (3_FE_02 ruling 5): zoom out, Fit and zoom in in the header; the
// selection bar's Comment, Move to (3_FE_03 ruling 8), Remove (N24) and Zoom (short words; the tooltip and
// accessible name say the rest); the area bar's
// Zoom to this area; and a digit, which opens the Go to card box (go-to-card.ts). ONE table drives the header buttons, the bars and the keys, so nothing is
// wired twice. They change only what the person sees (or open the note bubble or the move list),
// so none is a ledger event (rule 8 covers the note, the move and the removal themselves, which are
// written through the action layer).
import * as commandsWords from './words/commands.ts';
import * as commonWords from './words/common.ts';

export const COMMAND_IDS = ['zoom-out', 'fit', 'zoom-in', 'comment', 'move', 'reset-places', 'remove', 'zoom-selection', 'zoom-area', 'container-note', 'go-to-card'] as const;
export type CommandId = (typeof COMMAND_IDS)[number];

export interface CommandDef {
  /** The button's visible word. */
  label: string;
  /** What it does in full, when `label` is short: the tooltip, the accessible name and the key
   *  list's row say this (selection-bar-shorter ruling 5). */
  means?: string;
  /** The key list's row, when `means` is too long for its column beside two keys (Remove). */
  listed?: string;
  /** Keys that run it (`KeyboardEvent.key`, lower case, `shift+` in front for a Shift
   *  combination), the first one shown in hints. */
  keys: readonly string[];
  /** The keys as the key list shows them, when they are too many to list one by one (0–9). */
  shown?: readonly string[];
  /** Drawn as the bar's primary button. */
  primary?: boolean;
  /** The header button's text, when it is a symbol rather than the label. */
  glyph?: string;
  /** It leads to a person act (a note, a move): off while a past version shows (versions.ts). */
  acts?: true;
}

export const COMMANDS: Record<CommandId, CommandDef> = {
  'zoom-out': { label: commandsWords.zoomOut, keys: ['-'], glyph: '−' },
  fit: { label: commonWords.fit, keys: ['f'] },
  'zoom-in': { label: commandsWords.zoomIn, keys: ['+', '='], glyph: '+' },
  // N, and C when two or more are selected (C alone is a card's own comment, keys.ts).
  comment: { label: commandsWords.comment, keys: ['n', 'c'], primary: true, acts: true },
  // The list of the board's containers, Later last (3_FE_03 ruling 8, move-menu.ts).
  move: { label: commandsWords.moveTo, keys: ['shift+m'], acts: true },
  // R with a selection; with none, R is the focused card's own reset (keys.ts).
  'reset-places': { label: commandsWords.resetPlaces, keys: ['r'], acts: true },
  // The selected cards leave the board, after a confirm (N24, remove-flow.ts): the bar says "Remove";
  // its tooltip says the card or the cards (selectionButtons). Without the personRemove flag the bar
  // has no such button and the keys do nothing.
  remove: { label: commandsWords.remove, means: commandsWords.removeTheSelectedCards, listed: commandsWords.removeCards, keys: ['delete', 'backspace'], acts: true },
  'zoom-selection': { label: commonWords.zoom, means: commandsWords.zoomToTheSelection, keys: ['z'] },
  'zoom-area': { label: commandsWords.zoomToThisArea, keys: [] },
  // C or N with focus on a container's title line or its controls (3_FE_04 ruling 8): the
  // container's note, a comment as N is for the selection. Those keys mean this only there.
  'container-note': { label: commandsWords.commentOnContainer, keys: ['c', 'n'], acts: true },
  // Any digit, with focus anywhere on the board but a text field (go-to-card.ts): the box opens
  // holding it. Without the goToCard flag the keys do nothing.
  'go-to-card': { label: commonWords.goToCard, means: commandsWords.goToACardBy, keys: [...'0123456789'], shown: ['0–9'] },
};

/** Where each command shows: the header's zoom group, the selection bar, the area bar. */
export const HEADER_COMMANDS: readonly CommandId[] = ['zoom-out', 'fit', 'zoom-in'];
export const SELECTION_COMMANDS: readonly CommandId[] = ['comment', 'move', 'reset-places', 'remove', 'zoom-selection'];
export const AREA_COMMANDS: readonly CommandId[] = ['zoom-area'];
/** The commands whose keys apply on a focused container's title line, before any other meaning. */
export const REGION_COMMANDS: readonly CommandId[] = ['container-note'];

const byKey = (ids: readonly CommandId[]) => new Map(ids.flatMap((id) => COMMANDS[id].keys.map((k) => [k, id] as const)));
const BY_KEY = byKey(COMMAND_IDS.filter((id) => !REGION_COMMANDS.includes(id)));
const ON_REGION = byKey(REGION_COMMANDS);

/** The command a key runs, if any. */
export const commandForKey = (key: string): CommandId | undefined => BY_KEY.get(key);

/** The command a key runs with focus on a container's title line, if any. */
export const regionCommandForKey = (key: string): CommandId | undefined => ON_REGION.get(key);

export const isCommand = (s: string | undefined): s is CommandId => COMMAND_IDS.includes(s as CommandId);

/** A key as a hint shows it: "Shift+M", "Z". */
export const keyText = (key: string) => key.split('+').filter(Boolean)
  .map((k) => (k === 'shift' ? commandsWords.shift : k.length > 1 ? k[0]!.toUpperCase() + k.slice(1) : k.toUpperCase())).join('+') || key;

/** A button's tooltip: what it does and its key ("Zoom in · +", "Zoom to the selection · Z"). */
export function commandTitle(id: CommandId): string {
  const { means, label, keys } = COMMANDS[id];
  return keys[0] ? `${means ?? label} · ${keyText(keys[0])}` : means ?? label;
}

/** A zoom button's tooltip: its label, its key and the level the board is at ("Zoom in · + · 75% now"). */
export const zoomTitle = (id: CommandId, percent: number): string => commandsWords.now(commandTitle(id), percent);

/** The bar's buttons for a list of commands; with `readOnly`, none that acts; `off` are disabled. */
export const barButtons = (ids: readonly CommandId[], readOnly = false, off: readonly CommandId[] = []) =>
  ids.filter((id) => !(readOnly && COMMANDS[id].acts)).map((id) => ({
    id, label: COMMANDS[id].label, ...(COMMANDS[id].means && { title: commandTitle(id) }), ...(COMMANDS[id].primary && { primary: true }), ...(off.includes(id) && { disabled: true }),
  }));

/** The selection bar's buttons over `count` cards: Remove's tooltip says "card" for one, and
 * is left out without the personRemove flag (`remove`); `readOnly` and `off` as for `barButtons`. */
export const selectionButtons = (count: number, remove: boolean, readOnly = false, off: readonly CommandId[] = []) =>
  barButtons(SELECTION_COMMANDS.filter((id) => remove || id !== 'remove'), readOnly, off)
    .map((b) => (b.id === 'remove' && count === 1 ? { ...b, title: b.title!.replace('cards', 'card') } : b));
