// The conversation box on the board (D-099 3, FE_03): a node's notes open one box to read and to write.
// Its tabs are this node, then each note on several nodes it is in (the design review of DESIGN_01); a tab lists that
// conversation and writes to it. Add note (Enter) keeps the note for the board's Send, as a note always did. Ask now
// (Cmd or Ctrl Enter) sends the tab's note at once: a node holds at most one note not yet sent (api.md 59), so words
// typed join that note as an edit, or become the note, and then the `ask` is written for it (api.md 188), apart from
// Send, whose other answers keep waiting. With no agent listening Ask now keeps the words as a note for the next Send
// and says so. Enter does the box's mode, Add note unless the person pressed Ask now (FIX_03 ruling 3): the last of
// the two pressed, kept for the board as its zoom is (`BoxDeps.mode`, ask-now.ts). Words typed are never lost: a failed write keeps them in the field, and the field is kept through a
// redraw (vb-note-bubble `show(..., true)`). What it says: `boxView`; notes.ts opens, places and closes it.
import type { ItemNote } from '#actions';
import type { BoxAct, BubbleTab, NoteEventDetail, VbNoteBubbleElement } from '#ui';
import { bubbleView, conversation } from '#ui';
import type { ActFields } from '../io.ts';
import type { Open, Shown, ViewDeps } from './note-views.ts';
import { noteWrite, unsentGroupNote, unsentNote } from './note-find.ts';
import * as notesWords from '../words/notes.ts';

/** What the box needs beyond the notes: Ask now's way to the agent and what stops it (controller/ask-now.ts). */
export interface BoxDeps {
  /** Why no message can go now (read-only, a locked board, the agent's turn running); null when one can. */
  blocked(): string | null;
  /** Whether an agent is there to hear Ask now (one joined the ledger, or the host's one bot). */
  listening(): boolean;
  /** Write the `ask` for note `seq`: null when recorded, else the problem's words. */
  ask(seq: number): Promise<string | null>;
  /** The box shows node `id`'s replies: the person has read them (the notes mark goes back to its count). */
  looked(id: string): void;
  /** The box's mode on the board shown, what Enter does: Add note (`save`) until the person presses Ask now. */
  mode(): BoxAct;
  /** The person pressed Add note or Ask now: it is the board's mode now. */
  setMode(act: BoxAct): void;
}

/** A group of nodes, by its sorted numbers: a note on several nodes is one tab. */
const groupKey = (nodes: readonly (number | string)[]): string => nodes.map(Number).sort((a, b) => a - b).join(',');

/** The tab's conversation: on this node, its own notes and the replies that answer none of the group notes; on a
 *  group's tab, that group's notes and the replies to them. */
function tabOf(d: ViewDeps, o: Open, all: readonly ItemNote[]) {
  const key = o.group ? groupKey(o.group) : undefined;
  const notes = all.filter((x) => (x.nodes ? groupKey(x.nodes) : undefined) === key);
  const mine = new Set(notes.map((x) => x.seq));
  const grouped = new Set(all.filter((x) => x.nodes).map((x) => x.seq));
  const replies = d.replies(o.id).filter((r) => (key ? r.to !== undefined && mine.has(r.to) : r.to === undefined || !grouped.has(r.to)));
  return { key, notes, replies };
}

/** The tabs: none unless the node is in a note on several nodes; then this node, and one per group, "With 28". */
function tabsOf(all: readonly ItemNote[], n: number, key: string | undefined): BubbleTab[] {
  const groups = [...new Set(all.flatMap((x) => (x.nodes ? [groupKey(x.nodes)] : [])))];
  if (!groups.length) return [];
  const others = (g: string) => g.split(',').filter((x) => x !== String(n)).join(', ');
  return [{ key: '', label: notesWords.thisNode, on: key === undefined },
    ...groups.map((g) => ({ key: g, label: notesWords.withNodes(others(g)), on: g === key }))];
}

/** What the box says for the node and tab `o` shows. "Waiting for the agent" while its latest note went (a Send or Ask
 *  now) and no reply came after it. */
export function boxView(d: ViewDeps, box: BoxDeps, o: Open): Shown | null {
  const n = d.node(o.id);
  if (!n || n.n === undefined) return null;
  const all = d.state().items.get(o.id)?.notes ?? [];
  const { key, notes, replies } = tabOf(d, o, all);
  const last = notes.at(-1);
  const waiting = last?.sent === true && !replies.some((r) => r.seq > last.seq);
  // A selection (several anchors): no number, no tabs, titled by how many it is on.
  const sel = o.anchor.length > 1;
  const v = bubbleView({
    mode: 'conversation', kind: 'comment', text: o.draft, ...(sel ? { title: notesWords.cards(o.anchor.length), tabs: [] } : { number: n.n, title: n.title, tabs: tabsOf(all, n.n, key) }),
    blocked: box.blocked(), waiting, active: box.mode(), entries: conversation(notes, replies), ...(o.group && { numbers: o.group.map(Number) }),
  });
  return { v, on: sel ? {} : { kind: n.kind, number: n.n } };
}

/** The tab's note not yet sent: the one Add note joins and Ask now sends. */
const queuedOf = (d: ViewDeps, o: Open): ItemNote | undefined => (o.group ? unsentGroupNote(d.state(), o.group) : unsentNote(d.state(), o.id));

/** The act that writes `words` for `o` (note-find.ts `noteWrite`). */
const writeOf = (d: ViewDeps & { ver(id: string): number | undefined }, o: Open, words: string): ActFields =>
  noteWrite(d.state(), o.id, words, d.ver(o.id), o.group);

export interface BoxChoiceDeps extends ViewDeps {
  ver(id: string): number | undefined;
  attempt(fields: ActFields): Promise<string | null>;
  toast(text: string): void;
  box: BoxDeps;
  bubble: VbNoteBubbleElement;
  /** Whether `o` is still the open box (it may close or change while a write is on its way). */
  still(o: Open): boolean;
  /** Draw the box for `o` afresh: its field empty, focus in it, the latest in view. */
  again(o: Open): void;
  /** Close the box for `o` (Add note is done: the note waits for the board's Send, point 659). */
  done(o: Open): void;
}

/** Write the field's words for `o`, if any: true when there was nothing to write or it was written; on a failure the
 *  box says why and the words stay in the field. */
async function write(c: BoxChoiceDeps, o: Open, words: string, by: 'save' | 'ask'): Promise<boolean> {
  if (!words) return true;
  c.bubble.setPhase('saving', '', by);
  const problem = await c.attempt(writeOf(c, o, words));
  if (problem !== null && c.still(o)) c.bubble.setPhase('error', notesWords.notSaved(problem));
  return problem === null;
}

/** Add note: the words join the tab's note for the board's Send, and the box closes (point 659; Ask now keeps it open
 *  for the reply). */
export async function addNote(c: BoxChoiceDeps, o: Open, text: string): Promise<void> {
  const words = text.trim();
  if (!words) return c.bubble.focusText();
  const action = queuedOf(c, o) ? 'note-edit' : 'comment';
  if (!(await write(c, o, words, 'save')) || !c.still(o)) return;
  c.done(o);
  c.toast(notesWords.noteOn(c.node(o.id)?.n ?? o.id, action));
}

/** Add note or Ask now in the box (`vb-note`'s `save` or `ask`): a press of either button makes it the mode first. */
export function choose(c: BoxChoiceDeps, o: Open, { choice, text, active }: NoteEventDetail): Promise<void> | undefined {
  if (active) c.box.setMode(active);
  if (choice === 'save') return addNote(c, o, text);
  if (choice === 'ask') return askNow(c, o, text);
  return undefined;
}

/** Ask now: the tab's note, with the words typed joined to it, goes to the agent at once (the `ask`). While no message
 *  can go the box says why and keeps the words; with no agent listening they wait as a note for Send, which it says. */
export async function askNow(c: BoxChoiceDeps, o: Open, text: string): Promise<void> {
  const why = c.box.blocked();
  if (why) return c.bubble.setPhase('error', why);
  const words = text.trim();
  if (!c.box.listening()) {
    if (words && (!(await write(c, o, words, 'ask')) || !c.still(o))) return;
    if (words) c.again(o);
    return c.toast(notesWords.noAgentIsListening);
  }
  if (!(await write(c, o, words, 'ask')) || !c.still(o)) return;
  const queued = queuedOf(c, o);
  if (!queued) return c.bubble.focusText(); // nothing typed and nothing waiting: nothing to ask
  c.bubble.setPhase('saving', '', 'ask');
  const problem = await c.box.ask(queued.seq);
  if (!c.still(o)) return;
  c.again(o);
  if (problem !== null) c.bubble.setPhase('error', notesWords.notAsked(problem));
}
