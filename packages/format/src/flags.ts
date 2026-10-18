// Feature flags (rule 12; docs/specification/components.md § Feature flags). The one definition:
// every flag, its default and what it switches. New behaviour checks `flagOn(name, overrides)`;
// the page builds `overrides` from the URL and localStorage (apps/board/src/flags.ts), tests and
// the gallery pass them directly. A flag is removed from here when its behaviour becomes the default.

export interface FlagDef {
  readonly default: boolean;
  readonly description: string;
}

export const FLAGS = {
  nodeSize: {
    // On by default (maintainer, 2026-10-05); ?flags=-nodeSize turns it off.
    default: true,
    description: 'Cards take one of three widths (S, M, L) from their content, with a size control on each card (D-030, U7).',
  },
  hideControlsZoomedOut: {
    // On by default (maintainer, 2026-10-12, N13 ruling 2); ?flags=-hideControlsZoomedOut turns it off.
    default: true,
    description: 'Below the zoom FAR_K (apps/board/src/board/viewport.ts; the toolbar shows the zoom as a percentage), hide the cards\' buttons, the size control and the containers\' icon row, so none draws too small to press (N8; 55% since review polish round 2, N13 closed). Off, every control stays visible at every zoom.',
  },
  agentAccess: {
    default: true,
    description: 'The person\'s side of agent access: allow or refuse grant requests, see and remove each container\'s holders, and Send to agent (D-027, U4 2_FE_01).',
  },
  wireLayers: {
    // On by default (maintainer, 2026-10-06, D-032); ?flags=-wireLayers turns it off.
    default: true,
    description: 'Connectors draw behind container frames and cards, cards are see-through (--vb-card-fill) so a connector behind one still shows, and the focused card\'s connectors draw above the cards (D-032).',
  },
  keepView: {
    // On by default (maintainer, 2026-10-07, found-in-use FE_02); ?flags=-keepView turns it off.
    default: true,
    description: 'Each board\'s zoom and position are kept in sessionStorage (vb.view.<board>) and restored when the board opens, so a reload keeps the view; off, a board always fits on open.',
  },
  titleTip: {
    // On by default (maintainer, 2026-10-07, found-in-use FE_03); ?flags=-titleTip turns it off.
    default: true,
    description: 'A container title cut at two lines shows its full text in a tip below the title, on hover of the title and on keyboard focus in the label group (WCAG 1.4.13); off, a cut title ends in an ellipsis with no tip.',
  },
  notePreview: {
    // On by default (maintainer, 2026-10-07, found-in-use FE_04); ?flags=-notePreview turns it off.
    default: true,
    description: 'A card note cut at three lines shows its full text, as Markdown, in a box beside the card on hover and on keyboard focus (WCAG 1.4.13: hoverable, persistent, Esc dismisses); a click still opens the note bubble; off, a cut note has no preview.',
  },
  versionView: {
    // On by default (maintainer, 2026-10-07, navigation FE_01); ?flags=-versionView turns it off.
    default: true,
    description: 'The toolbar shows each fact once: the picker holds titles only, the title heading is for screen readers, and a version dropdown lists the board\'s own versions; choosing a past one shows the board as it was, read-only, under a "Back to now" banner. Off, the toolbar shows the title and the ledger\'s latest line as before.',
  },
  containerFinder: {
    // On by default (maintainer, 2026-10-07, navigation FE_02); ?flags=-containerFinder turns it off.
    default: true,
    description: 'A Containers dropdown in the toolbar lists every container on the board with its card count, Later always last (greyed when empty); choosing one zooms to it and focuses its title; it works in a past version too (N18).',
  },
  keyBubble: {
    // On by default (maintainer, 2026-10-07, navigation FE_04); ?flags=-keyBubble turns it off.
    default: true,
    description: 'The key help along the bottom is a small "?" bubble at the bottom left: hover, focus or the ? key lists every command (grouped Items, Selection, Board, View), generated from the command table and the action registry; Esc closes it. Off, the board shows no key help (N20).',
  },
  boardEdit: {
    // On by default (maintainer, 2026-10-07, navigation BE_01 ruling 3); ?flags=-boardEdit turns it off.
    default: true,
    description: 'The board picker ends with New board… and Rename board…, each opening a small dialog (title, optional summary) that writes the person\'s `board` line through `put_board` (api.md 90); a new board\'s id is made from its title and it opens at once. Off while a past version shows. Off, only agents make boards and nobody renames them (N22).',
  },
  proposals: {
    // On by default (maintainer, 2026-10-08, proposals-seen-parking FE_01); ?flags=-proposals turns it off.
    default: true,
    description: 'An agent\'s proposal to acknowledge or drop a card shows as a PROPOSAL tab on its bottom edge (OUT OF DATE once the card changed); the tab opens a box beside the card with Reject and Accept. A bar above the board counts them, with Review and Accept all (api.md 93). Off while a past version shows. Off, proposals stay in the ledger unseen on the page.',
  },
  cardUpdates: {
    // On by default (maintainer, 2026-10-08, proposals-seen-parking FE_02); ?flags=-cardUpdates turns it off.
    default: true,
    description: 'A card the agent changed since the person last saw it (past version 1) carries an "N updates" tab on its bottom edge; the tab expands the card in place to step through each unseen version (when, who, change chips), each step marking that version seen, until "You\'re up to date". Selecting a card marks its latest version seen. Off while a past version shows. Off, no tab and no seen on select.',
  },
  newCards: {
    // On by default (maintainer, 2026-10-08, stage5-follow-ups FE_01); ?flags=-newCards turns it off.
    default: true,
    description: 'A card the agent added after the person first opened the board (`item.new`, api.md 97) carries a NEW tab on its bottom edge until the person selects or acts on it, or the next round starts (a Send, then the agent drawing again). A new card shows NEW only, never "N updates". Selecting a card sends seen for each card condition whose `clearedBy` names select. Off while a past version shows. Off, no NEW tab and the card shows its updates as before.',
  },
  handover: {
    // On by default (maintainer, 2026-10-08, proposals-seen-parking FE_03); ?flags=-handover turns it off.
    default: true,
    description: 'A card saved for later whose handover the agent still owes says "Awaiting" in its footer (tip: "Awaiting context"). Once the agent writes the handover, a HANDOVER tab on the card\'s bottom edge opens it in a box beside the card: situation, background, assessment, recommendation, then the sources (D-020). Off, the card shows "Saved for later" and the handover stays in the ledger unseen on the page.',
  },
  cardReplies: {
    // On by default (maintainer, 2026-10-08, proposals-seen-parking FE_03); ?flags=-cardReplies turns it off.
    default: true,
    description: 'An agent\'s reply shows under the note it answers, on a card or in a container\'s note block: "Agent reply" with the agent\'s label, as Markdown, cut like a note with the same full-text preview. A reply naming no note shows after the card\'s notes. Replies are read-only. Off, replies stay in the ledger unseen on the page.',
  },
  selectionPill: {
    // On by default (maintainer, 2026-10-08, stage5-follow-ups FE_02); ?flags=-selectionPill turns it off.
    default: true,
    description: 'With cards selected, the selection bar is a small pill ("3 selected" and a chevron); a click or Enter on it opens a more compact bar with the same commands, which stays open until a press outside it, a pan, Esc or the selection clearing. A new selection starts closed; the selection\'s keys work either way. Off, the full bar shows on every selection.',
  },
  chatPanel: {
    // On by default (maintainer, 2026-10-09, chat-panel VERIFY_01); ?flags=-chatPanel turns it off.
    default: true,
    description: 'The chat panel (D-036, D-037): a sidebar on the right where the person talks to a command-line agent beside the board. Its words show in the feed, its board writes as change chips that zoom to the cards, its file edits and shell commands wait for Allow or Deny. Off, no panel (and the gallery has no chat section).',
  },
  toolbarMenu: {
    // On by default (maintainer, 2026-10-09, toolbar icons and menu); ?flags=-toolbarMenu turns it off.
    default: true,
    description: 'Theme, Hide decided and Reply move into a "⋯" menu at the end of the toolbar (a click or Enter opens it; Esc, a click outside or a choice closes it; H still hides decided items), and Agents (with its holder count), Send to agent and Chat show an icon only on a narrow window, so no toolbar control is cut off from 768px up. Off, the toolbar is as it was.',
  },
  openFolder: {
    // On by default (maintainer, 2026-10-09, open-folder task, tracker U12); ?flags=-openFolder turns it off.
    default: true,
    description: 'The "⋯" menu ends with Open folder…, a picker of the folders under the home folder (recent first, a folder with a Vision Board marked) that opens one, or creates its Vision Board, in place of the open folder (api.md 109-113); every open page then reloads onto it. The page title names the open folder and the last board is kept per folder. Off, the page never asks which folder is open.',
  },
  everyNode: {
    // On by default (maintainer, 2026-10-10, every-node PLAN rulings 1-4, FE_01); ?flags=-everyNode turns it off.
    default: true,
    description: 'Every card shows its number and the buttons its kind offers: a question, decision or action ✓, ✗, Comment, More context and Later (✓ and ✗ read "Yes" and "No" on a question, ✓ "Done" on an action); every other kind Comment, More context and Later. Comment on a selection takes any cards. Off, only cards that need an answer show a number and buttons (api.md 118-120).',
  },
  cardFlag: {
    // On by default (maintainer, 2026-10-11, field report batch 2 ruling 3, assumption A); ?flags=-cardFlag turns it off.
    default: true,
    description: 'Every card with a number has a small flag button beside Later (Shift+F on a focused card): the person\'s private mark, kept in the ledger and never sent to an agent (api.md 128). A flagged card shows it on the button, keeps it through a redraw, and a "N flagged" chip in the toolbar steps through the flagged cards. Off while a past version shows. Off, no button, no key and no chip; flags stay in the ledger.',
  },
  retiredMarker: {
    // On by default (maintainer, 2026-10-11, field report batch 2 ruling 1); ?flags=-retiredMarker turns it off.
    default: true,
    description: 'A container the agent retired cards from, one at a time, shows a small "N cards retired" marker in its title line; it opens the board version where they last appeared (read-only, with the versionView flag). Retired cards and containers are gone from the board either way. Off, no marker.',
  },
  linkLabels: {
    // On by default (field report batch 3 ruling 3, FE_01); ?flags=-linkLabels turns it off.
    default: true,
    description: 'A link\'s label sits on its line near the source end, on a background so the line does not show through, wherever the layout found it room (`Route.labelAt.fits`); where it did not, a small marker sits on the line, and hovering or focusing the marker floats the label above everything (WCAG 1.4.13: hoverable, persistent, Esc dismisses). Off, every label is drawn at the middle of its line as before.',
  },
  alignSetting: {
    // On by default (field report batch 3 ruling 4, FE_01); ?flags=-alignSetting turns it off.
    default: true,
    description: 'The "⋯" menu has Centre cards, a per-viewer setting kept in this browser (vb.align) and never sent to an agent: off (the default), a row of cards lines up by their tops and a column by their left edges; on, both are centred. Off, the menu has no such row and cards line up by their tops and left edges.',
  },
  widthsControl: {
    // On by default (field report batch 3 ruling 5, FE_01); ?flags=-widthsControl turns it off.
    default: true,
    description: 'Each container\'s mode row has a Match card widths switch: on, every card in a column takes the width of its widest card; off, each card keeps its own width. It sends the person\'s `widths` act (api.md 132); the agent may set a container\'s widths when drawing. Off, no switch; the agent\'s or the layout\'s default widths still apply.',
  },
  archiveBoard: {
    // On by default (maintainer, 2026-10-12, N39 rulings 4-6); ?flags=-archiveBoard turns it off.
    default: true,
    description: 'The "⋯" menu has Archive board…, which asks first, then hides the open board from every agent and from the picker and opens the next board (api.md 135-137); the board picker ends with Archived (N)…, a list of archived boards each with Restore, which brings the board back and opens it. Off, neither shows; an archived board stays hidden.',
  },
  lockBoard: {
    // On by default (maintainer, 2026-10-12, N40 rulings 1-7); ?flags=-lockBoard turns it off.
    default: true,
    description: 'The "⋯" menu has Lock board and, on a locked board, Unlock board (api.md 138-140): a locked board is read-only for everyone until the person unlocks it. Off, neither row shows; a board locked before stays locked (its controls paused, "Locked" beside its name), and the server refuses every change to it.',
  },
  personRemove: {
    // On by default (maintainer, 2026-10-12, N24 rulings 1-5); ?flags=-personRemove turns it off.
    default: true,
    description: 'The person removes cards and containers: Remove card on the selection bar (Delete or Backspace) and Remove container in a container\'s settings, each after a confirm naming what goes and warning of anything still owed an answer (api.md 141). Removed cards leave the board and keep their history and numbers, like an agent\'s retire. Off, neither control shows and the keys do nothing.',
  },
  goToCard: {
    // On by default (maintainer, 2026-10-15, go-to-card task rulings 1-5); ?flags=-goToCard turns it off.
    default: true,
    description: 'A digit typed on the board, outside a text field, opens a small "Go to card" box at the board\'s bottom right holding it: Enter selects and focuses that card (the board pans only when it is off screen, the zoom stays), Backspace edits, Esc closes. A number with no card says so and the box stays; a retired card says it was removed and offers the version where it last appeared. Off, digits do nothing.',
  },
  appCards: {
    // On by default (maintainer's go, 2026-10-17, app-cards ruling 13); ?flags=-appCards turns it off.
    default: true,
    description: 'An app card (kind `app`, D-047) shows the app the agent built in a sandboxed panel inside the card, sized by the agent; its tools run on the board\'s server only after the person presses Allow for that version of the code (docs/specification/apps.md). Off, an app card draws as a plain card saying "App cards are off", and the panel route and call_app_tool answer not-found.',
  },
  goAfterPause: {
    // Off by default (maintainer, 2026-10-15, go-to-card task ruling 2: Enter goes, nothing goes by itself); ?flags=goAfterPause tries it.
    default: false,
    description: 'With the goToCard flag, the "Go to card" box also goes about 1 second after the last digit typed, without Enter (`GO_PAUSE`, apps/board/src/board/go-to-card.ts). Off, only Enter goes.',
  },
} as const satisfies Record<string, FlagDef>;

export type FlagName = keyof typeof FLAGS;
export type FlagOverrides = Partial<Record<FlagName, boolean>>;

export const isFlag = (name: string): name is FlagName => Object.hasOwn(FLAGS, name);

/** Whether a flag is on: an override when given, else its default. An unknown name throws. */
export function flagOn(name: FlagName, overrides: FlagOverrides = {}): boolean {
  if (!isFlag(name)) throw new Error(`unknown feature flag "${String(name)}"`);
  return overrides[name] ?? FLAGS[name].default;
}

/**
 * Reads a flag list as the URL (`?flags=nodeSize`) and localStorage (`vb.flags`) write it: names
 * separated by commas, each one turning a flag on, or off with a leading minus. The last mention
 * wins. Unknown names are refused (listed, never applied).
 */
export function parseFlags(text: string | null | undefined): { overrides: FlagOverrides; refused: string[] } {
  const overrides: FlagOverrides = {};
  const refused: string[] = [];
  for (const part of (text ?? '').split(',')) {
    const word = part.trim();
    if (!word) continue;
    const off = word.startsWith('-');
    const name = off ? word.slice(1) : word;
    if (isFlag(name)) overrides[name] = !off;
    else refused.push(name);
  }
  return { overrides, refused };
}
