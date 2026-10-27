// What the stage's input does on the board: each press, key or drag the stage reports (input/wiring.ts
// `StageHandlers`) goes to the flow that owns it. Split out of controller.ts (ARCH_06): the table
// is the board's one routing of input to its flows, so it reads on its own. While a past version
// shows, or the board is locked, the handlers that act do nothing (the caller wraps the table in
// versions.ts and lock-flow.ts `guard`). Browser only.
import type { AccessFlow } from '../access/index.ts';
import type { Drawing, createFocus, createPlaces } from '../canvas/index.ts';
import type { ProposalFlow, createFlagFlow, createItemActs, createRemoveFlow, createUpdateFlow } from '../cards/index.ts';
import type { StageHandlers } from '../input/index.ts';
import type { NoteFlow } from '../notes/index.ts';
import type { Moves, Selection, createContainerDrag, createSelectionFlow } from '../selection/index.ts';
import type { createVersions } from '../boards/index.ts';
import type { View } from '#format';
import type { Status } from '../status.ts';

type Returns<F extends (...args: never[]) => unknown> = ReturnType<F>;

/** The flows the table routes to. A flag that is off leaves its flow out (`flags`, `access`, `removal`). */
export interface HandlerFlows {
  act: Returns<typeof createItemActs>;
  flags: Returns<typeof createFlagFlow> | null;
  access: AccessFlow | null;
  removal: Returns<typeof createRemoveFlow> | undefined;
  proposals: ProposalFlow;
  updates: Returns<typeof createUpdateFlow>;
  notes: NoteFlow;
  places: Returns<typeof createPlaces>;
  frames: Returns<typeof createContainerDrag>;
  moves: Moves;
  flow: Returns<typeof createSelectionFlow>;
  versions: Returns<typeof createVersions>;
  selection: Selection;
  drawing: Drawing;
  focus: Returns<typeof createFocus>;
  view: () => View;
  showVersion: (seq: number | null, until?: number) => Promise<void>;
  toggleHide: () => void;
  status: Status;
}

export function stageHandlers(f: HandlerFlows): StageHandlers {
  const { act, flags, access, removal, proposals, updates, notes, places, frames, moves, flow, versions, selection, drawing, focus, view } = f;
  return {
    act: (id, a) => void act(id, a), ...(flags && { flag: (id: string) => void flags.toggle(id) }), showVersion: (seq, until) => void f.showVersion(seq, until),
    answer: (id, seq, a) => void proposals.answer(id, seq, a),
    showNote: (id, seq, fromNote) => notes.show(id, seq, fromNote), showReply: (id, seq) => notes.reply(id, seq), setSize: places.setSize,
    setMode: (region, mode) => void places.setMode(region, mode), setWidths: (region, widths) => void places.setWidths(region, widths),
    resetRegion: (region) => void places.resetRegion(region), putBack: (region) => void places.putBack(region),
    regionComment: (region) => notes.container(region),
    ...(access && { revoke: (region: string, holder: string) => void access.revoke(region, holder) }), ...(removal && { removeRegion: removal.container }),
    pin: (id, box) => void places.pin(id, box), pinRegion: (region, at) => void frames.pin(region, at),
    frameStart: frames.start, frameMove: frames.move, frameEnd: (d) => void frames.end(d),
    regionCommand: (_id, region) => notes.container(region, 'comment'), unpin: (id) => void places.unpin(id),
    layout: () => drawing.layout, view, drawDrag: (layout, id) => drawing.wiresFor(layout, id),
    carried: moves.carried, dragStart: moves.dragStart, dragOver: moves.dragOver,
    drop: (boxes, at) => void moves.drop(boxes, at),
    step: (from, dir) => { const next = focus.neighbour(from, dir); if (next) drawing.cards.get(next)?.focus({ preventScroll: true }); },
    command: (id, key) => flow.command(id, key), toggleHide: f.toggleHide, lassoMove: flow.lassoMove, lassoEnd: flow.lassoEnd, lassoCancel: flow.lassoCancel,
    pick: (id, add) => { selection.select([id], add ? 'toggle' : 'only'); updates.saw([id]); },
    toggle: (id) => selection.select([id], 'toggle'), clear: () => { selection.clear(); flow.dismissArea(); },
    // Esc closes an open bubble first, then the open selection bar (FE_02), then leaves a past version, else clears the selection (ruling 1).
    escape: () => {
      if (notes.open) return notes.close();
      if (flow.collapse()) return;
      if (versions.state) return void versions.show(null);
      f.status.set({ replyOpen: false });
      flow.dismissArea(); selection.clear();
    },
  };
}
