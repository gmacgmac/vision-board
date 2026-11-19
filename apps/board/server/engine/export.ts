// The export read (D-107; api.md 197, 199): a board, or one container, as it stands now, as the export file
// (`ExportFile`): its containers, cards and links as the write items that draw them, each with a key (a container's is
// its id, a card's `card:<n>`, a link's `link:<n>><n>`); the person's ✓ and ✗ (`answers`) and places (`pins`, in the
// card's container); and, when asked, the notes with the agent's replies (`thread`). As the board shows it: a card in the
// container it is in now (the person's moves count), at its latest version and size, a container in the mode, widths
// and direction it shows, a radial container's centre by its card's key; retired cards and containers are out, and the
// board's Later is no container of the file (its cards keep `later`). One function for every door: `export_board` (the
// page), `get_board` and `show_container` with `export` (an agent). Built from the reads' own shapes; nothing is folded.
import type { ExportFile, From, Region, ViewNode } from '#format';
import { EXPORT_VERSION, LATER_REGION, NODE_TYPES, boardView, directionOf } from '#format';
import type { BoardState, LedgerReply, LedgerState } from '#actions';
import { boardState, placedView } from '#actions';
import { problem } from '../problem.ts';
import * as writesWords from '../words/writes.ts';

type Rec = Record<string, unknown>;

const cardKey = (n: string | number) => `card:${n}`;

/** A container as the region item that draws it, in the mode, widths and direction the board shows; its centre when the
 * card is in the file. */
function regionBody(s: LedgerState, board: string, st: BoardState, r: Region, inFile: ReadonlySet<string>): Rec {
  const { center, direction: _direction, ...rest } = r;
  const direction = directionOf(s, board, r.id);
  const widths = st.widths.get(r.id) ?? r.widths;
  return {
    ...rest, mode: st.modes.get(r.id) ?? r.mode, ...(widths !== undefined && { widths }),
    ...(direction !== 'across' && { direction }), ...(center !== undefined && inFile.has(center) && { center: { key: cardKey(center) } }),
  };
}

/** A card as the node item that draws it: its latest version, with the size the person picked. */
function nodeBody(st: BoardState, node: ViewNode): Rec {
  const { id, n: _n, ...body } = node;
  const size = st.sizes.get(id) ?? node.size;
  return { ...body, ...(size !== undefined && { size }) };
}

/** Who wrote reply `r` (point 617): the author an import kept, else the agent that wrote the line, by its id and label. */
function authorOf(s: LedgerState, r: LedgerReply): From {
  if (r.from) return r.from;
  const label = r.agent === undefined ? undefined : s.agents.get(r.agent);
  return { by: 'agent', ...(r.agent !== undefined && { agent: r.agent }), ...(label !== undefined && { label }) };
}

/** The agents' replies on the board, by the `seq` of the note each answers, oldest first, each with its author. */
function threads(s: LedgerState, nodes: readonly ViewNode[], ids: (n: string) => number | undefined): Map<number, { text: string; from: From }[]> {
  const out = new Map<number, LedgerReply[]>();
  for (const node of nodes) {
    for (const r of s.replies.get(ids(node.id) ?? -1) ?? []) if (r.to !== undefined) out.set(r.to, [...(out.get(r.to) ?? []), r]);
  }
  return new Map([...out].map(([to, list]) => [to, list.sort((a, b) => a.seq - b.seq).map((r) => ({ text: r.text, from: authorOf(s, r) }))]));
}

/** The person's notes on the cards and containers in the file, each once (a note on a group is on each of its cards),
 * with the agent's replies to it: card notes in card order, then container notes. A group note with a card outside
 * the file is left out. */
function notesOf(s: LedgerState, st: BoardState, nodes: readonly ViewNode[], regions: readonly string[], ids: (n: string) => number | undefined): Rec[] {
  const thread = threads(s, nodes, ids);
  const inFile = new Set(nodes.map((n) => Number(n.id)));
  const seen = new Set<number>();
  const out: Rec[] = [];
  const add = (seq: number, at: Rec, text: string) => {
    const replies = thread.get(seq);
    out.push({ ...at, text, ...(replies && { thread: replies }) });
  };
  for (const node of nodes) {
    for (const note of st.items.get(node.id)?.notes ?? []) {
      if (seen.has(note.seq) || (note.nodes && !note.nodes.every((n) => inFile.has(n)))) continue;
      seen.add(note.seq);
      add(note.seq, note.nodes ? { keys: note.nodes.map(cardKey) } : { key: cardKey(node.id) }, note.text);
    }
  }
  for (const region of regions) for (const note of st.regionNotes.get(region) ?? []) add(note.seq, { key: region }, note.text);
  return out;
}

/** Board `board`'s export file, or with `region` one container's (`not-found` when the board has no such container);
 * `notes` adds the notes. The caller has checked the board may be read. */
export function exportFile(s: LedgerState, board: string, opts: { region?: string | undefined; notes?: boolean } = {}): ExportFile {
  const st = boardState(s, board);
  const view = placedView(boardView(s, board), st);
  const one = opts.region === undefined ? undefined : view.regions.find((r) => r.id === opts.region && r.id !== LATER_REGION);
  if (opts.region !== undefined && !one) throw problem('not-found', writesWords.thereIsNoRegionOn(opts.region, board));
  const regions = one ? [one] : view.regions.filter((r) => r.id !== LATER_REGION);
  const nodes = view.nodes.filter((n) => !one || n.region === one.id);
  const inFile = new Set(nodes.map((n) => n.id));
  const ids = (n: string) => s.index.cards.get(board)?.[Number(n) - 1];
  const items = [
    ...regions.map((r) => ({ type: 'region', key: r.id, region: regionBody(s, board, st, r, inFile) })),
    ...nodes.map((n) => ({ type: 'node', key: cardKey(n.id), node: nodeBody(st, n) })),
    ...view.links.filter((l) => inFile.has(l.from) && inFile.has(l.to)).map((l) => ({
      type: 'link', key: `link:${l.from}>${l.to}`, from: { key: cardKey(l.from) }, to: { key: cardKey(l.to) }, ...(l.label && { label: l.label }),
    })),
  ];
  const answers = nodes.flatMap((n) => {
    const status = NODE_TYPES[n.kind].answer ? st.items.get(n.id)?.status : undefined;
    return status === 'acknowledged' ? [{ key: cardKey(n.id), answer: 'check' }] : status === 'dropped' ? [{ key: cardKey(n.id), answer: 'cross' }] : [];
  });
  const pins = nodes.flatMap((n) => { const p = st.pins.get(n.id); return p ? [{ key: cardKey(n.id), x: p.x, y: p.y }] : []; });
  const notes = opts.notes ? notesOf(s, st, nodes, regions.map((r) => r.id), ids) : [];
  return {
    v: EXPORT_VERSION, title: one ? one.title : view.title, items,
    ...(answers.length > 0 && { answers }), ...(pins.length > 0 && { pins }), ...(notes.length > 0 && { notes }),
  } as ExportFile;
}
