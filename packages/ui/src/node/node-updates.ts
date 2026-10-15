// Node pattern, layer 1 (core), the changed card's part (FE_02): the "N updates" tab and the
// stepper a changed card opens, worded from the versions the page passes in. Split out of
// node-core.ts along this seam (the flag, field report batch 2, grew it past 300 lines). No DOM.
import type { ViewNode } from '../../../format/src/index.ts';
import type { Change, FieldChange } from '../../../actions/src/index.ts';

/** One version a changed card steps through (FE_02): when and by whom, and what changed from the
 *  version before (`versionChanges`). `when` is in the person's clock; `agent` the writer's label.
 *  `reply`: the step is the agent's answer to the person's note, which cleared the card (D-045,
 *  answer-model ruling 7) and changed no version; `ver` is then the card's latest. */
export interface CardStep { ver: number; when: string; agent?: string; changes: readonly FieldChange[]; reply?: string }

/** A changed card (`item.unseen`, past version 1): `count`, the versions the person has not seen;
 *  while the stepper is open, `steps`, the versions it steps through, oldest first, and `at`, the one
 *  shown, `steps.length` once past the last ("You're up to date"); `source`, the words of a link to
 *  where its latest change came from (the board's chat, chat-panel FE_02), none for no link. */
export interface CardUpdates { count: number; steps?: readonly CardStep[]; at?: number; source?: string }

/** One change chip: "+ body", "~ title", "- tags". */
export interface UpdateChip { change: Change; text: string }

/** The step shown: the section's name, its line, chips and what the text gained; the footer's count. */
export interface UpdateStep { label: string; head: string; chips: UpdateChip[]; lines: string[]; count: string; first: boolean; source?: string }

/** The "N updates" tab and the stepper (mockup 03 Part B, option B). `tab` is empty once up to date. */
export interface UpdatesView { tab: string; label: string; open: boolean; done: boolean; step?: UpdateStep }

const SIGN: Record<Change, string> = { added: '+', changed: '~', removed: '-' };

/** `text` on one line, cut to `max` characters. */
const short = (text: string, max: number): string => {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/** What a step says the text gained (ruling 3): the new title, the added body, or "Body rewritten";
 *  for the agent's answer, its words. */
function stepLines(changes: readonly FieldChange[], reply?: string): string[] {
  if (reply !== undefined) return [short(reply, 160)];
  if (!changes.length) return ['Drawn again with no change'];
  return changes.flatMap((c) => {
    if (c.field === 'title' && c.text !== undefined) return [`Title: ${short(c.text, 100)}`];
    if (c.field === 'body' && c.change === 'added' && c.text) return [short(c.text, 160)];
    return c.field === 'body' && c.change === 'changed' ? ['Body rewritten'] : [];
  });
}

/** The tab and the stepper for a changed item; undefined with nothing unseen and no stepper open. */
export function updatesView(n: ViewNode, u?: CardUpdates): UpdatesView | undefined {
  if (n.n === undefined || !u || (!u.steps && u.count < 1)) return undefined;
  const { steps } = u, k = steps?.length ?? u.count;
  const tab = `${k} update${k === 1 ? '' : 's'}`;
  const at = u.at ?? 0;
  if (!steps) return { tab, label: `${tab} since you last looked. Show them`, open: false, done: false };
  const s = steps[at];
  if (!s) return { tab: '', label: 'Up to date', open: true, done: true };
  const count = `Update ${at + 1} of ${k}`;
  return {
    tab, label: `${tab} since you last looked. Hide them`, open: true, done: false,
    step: {
      label: `${count}, ${s.reply === undefined ? `v${s.ver}` : 'the agent\'s reply'}`, count, first: at === 0, ...(u.source && { source: u.source }),
      head: `${s.reply === undefined ? `v${s.ver}` : 'Reply'} · ${s.when} · ${s.agent ?? 'the agent'}`,
      chips: s.changes.map((c) => ({ change: c.change, text: `${SIGN[c.change]} ${c.field}` })), lines: stepLines(s.changes, s.reply),
    },
  };
}

/** What the updates add to the card's name: ", 3 unseen updates", or ", showing update 2 of 3". */
export const updateWords = (v?: UpdatesView): string =>
  !v || v.done ? '' : v.step ? `, showing ${v.step.count.toLowerCase()}` : `, ${v.tab.replace(' ', ' unseen ')}`;
