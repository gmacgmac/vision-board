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
    description: 'Below the zoom FAR_K (apps/board/src/board/canvas/viewport.ts; the toolbar shows the zoom as a percentage), hide the cards\' buttons, the size control and the containers\' icon row, so none draws too small to press (N8; 55% since review polish round 2, N13 closed). Off, every control stays visible at every zoom.',
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
    description: 'A card the agent added after the person first opened the board (`item.new`, api.md 97) carries a NEW tab on its bottom edge until the person selects, acts on or decides it; a Send and the agent drawing again never end it. A new card shows NEW only, never "N updates". Selecting a card sends seen for each card condition whose `clearedBy` names select. Off while a past version shows. Off, no NEW tab and the card shows its updates as before.',
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
  currentFolder: {
    // On by default (maintainer, 2026-10-26, current-folder task, chat points 193-197); ?flags=-currentFolder turns it off.
    default: true,
    description: 'The folder the board has open is always on show (needs openFolder): a chip with its name at the far left of the toolbar, its full path in the tooltip, a click opening the folder dialog; a "Current:" line under Open folder… in the "⋯" menu; and a "Current folder" line with the full path and a Copy button at the top of the folder dialog, apart from its lists. Off, the name is only in the page title and the Open folder… tooltip.',
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
  openList: {
    // On by default: the maintainer asked for it (chat 2026-10-19, point 43; open-list FE_01); ?flags=-openList turns it off.
    default: true,
    description: 'The toolbar\'s "N open" chip is a menu dropdown listing the open cards as "number · title" in board order (a long title cut with "…", whole in the option\'s tooltip); choosing one goes to it as Go to card does: selected and focused, the board panning only when it is off screen. It works in a past version. With nothing open it is the plain chip. Off, the chip is plain.',
  },
  appCards: {
    // On by default (maintainer's go, 2026-10-17, app-cards ruling 13); ?flags=-appCards turns it off.
    default: true,
    description: 'An app card (kind `app`, D-047) shows the app the agent built in a sandboxed panel inside the card, sized by the agent; its tools run on the board\'s server only after the person presses Allow for that version of the code (docs/specification/apps.md). Off, an app card draws as a plain card saying "App cards are off", and the panel route and call_app_tool answer not-found.',
  },
  appTitle: {
    // On by default (maintainer, 2026-10-19, card-polish point 28, option A: the window look; card-polish FE_04); ?flags=-appTitle turns it off.
    default: true,
    description: 'An app card reads as the app\'s window: no title over the panel in any state (the card\'s name still says it; the app\'s own header names it, a state without a panel says what is wrong, and zoomed out past FAR_K the panel\'s placeholder shows the app\'s title), the panel meets the card\'s top border, and the footer is the window\'s bar, tinted with the kind\'s colour, holding the app\'s name between Allow or "Allowed ▾" and the quick actions, one line, cut with "…" and whole in a tip while cut. The title takes no room in any state, so no state moves the card. Off, the title shows above the panel as on every card and the footer names nothing.',
  },
  cardHistory: {
    // On by default (maintainer, 2026-10-19, card-polish point 20); ?flags=-cardHistory turns it off.
    default: true,
    description: 'Every card with a footer has an ⓘ at its far right that opens the card\'s history beside it: when it was first drawn and each update (vN), each note sent, each agent reply, ✓, ✗ and reopened, and its app allowed or stopped, newest first, a time and one line each, from the state the page already holds. A note or reply row rings that note on the card. No note text and no private mark shows. Off, no ⓘ.',
  },
  cardImages: {
    // On by default (app-cards orchestrator decision 5, D-048 rulings 19-23); ?flags=-cardImages turns it off.
    default: true,
    description: 'Markdown draws `![alt](path)` as the image in the project\'s `.visionboard/images/` (D-048), which opens over the board at 70% of the screen. Off, it stays its text.',
  },
  svgImages: {
    // On by default with the maintainer's yes to D-064 (host-fixes-and-svg SVG_01); ?flags=-svgImages turns it off.
    default: true,
    description: 'With cardImages, an svg in the project\'s `.visionboard/images/` is a picture like a png (D-064): drawn only through <img>, so its CSS and SMIL animation play and its script never runs, and served under its own policy (no script, sandboxed) at its own address; at most 1 MB, and it must say its size (a viewBox, or a width and height). Off, an svg is refused as before ("only png, jpeg, webp or gif") by the page\'s Markdown (`renderMarkdown`\'s `svg`, from the host\'s settings) and by the server\'s route (its own flags).',
  },
  leavePrompt: {
    // On by default (maintainer, point 310; host-fixes-and-svg M11_01: words lost is the worse failure); ?flags=-leavePrompt turns it off.
    default: true,
    description: 'On the standalone page, while a note holds changed words not yet saved (the board\'s `unsaved`), closing or reloading the tab gets the browser\'s own "Leave site?" prompt, and so do the page\'s own reloads (a rebuilt page, a refused cookie, another tab opening another folder); opening another folder from the picker asks "Discard your changes?" first, before the server switches. The listener is there only while words are unsaved. Off, the tab closes without asking, as before. A host other than the page asks with the board\'s `leave()`, flag or not.',
  },
  toolRail: {
    // On by default (maintainer, 2026-10-25, container tool rail, chat points 1-15); ?flags=-toolRail turns it off.
    default: true,
    description: 'A container\'s tools (the layout icons, Match card widths, Comment and the settings cog) sit in a slim vertical rail on the frame\'s left edge, dimmed until hovered or focused, so the top line holds only the title, centred, with the whole line for it; a short frame\'s rail collapses and expands over the cards on hover or focus, and its popovers open to the right of it. Off, the tools sit on the top line after the title as before.',
  },
  freshCards: {
    // On by default (maintainer, 2026-10-25, chat points 78, 80, 86, 88; new-and-updated task); ?flags=-freshCards turns it off.
    default: true,
    description: 'New and updated cards are found at board scale: the "N updates" tab is outlined in pink at rest; a container holding a card that is new or updated since the person last engaged with any card in it (`container.fresh`, api.md 158) has a teal border and a "3 new · 1 updated" pill on its title line, until they select or act on one of its cards; and the toolbar\'s "N new" chip lists those cards as "number · title" (updated ones end "· updated") in board order, choosing one going to it as Go to card does. None of it shows in a past version. Off, the tab is grey until hovered and no container, pill or chip shows.',
  },
  groupNoteOnce: {
    // On by default (maintainer, 2026-10-25, chat points 91-93 and 103; group-note-once task); ?flags=-groupNoteOnce turns it off.
    default: true,
    description: 'A note on a selection of cards (one note with `nodes`, api.md 62) is drawn once: one pin per group, on the right edge of the group\'s lowest-numbered card just under that card\'s own note pin (or its next card, when an earlier group\'s pin is already there), in its own layer above the cards. Hovering or focusing it, and its bubble being open, ring each card of the group with a dashed line (never a box); pressing it selects the group\'s cards and opens the note, to edit or remove it, with the agent\'s replies to it shown once there. The cards\' own pins, "Your note" blocks and conversations leave the group\'s notes and replies out. Off, the note and its replies show on every card of the group.',
  },
  appFit: {
    // On by default (maintainer, 2026-10-27, point 312: app cards fit their content; app-panel-fits-content task); ?flags=-appFit turns it off.
    default: true,
    description: 'An app card fits its panel\'s content: a panel that tells its height (MCP Apps\' `ui/notifications/size-changed`, `{ height }`) gets a frame that height, rounded and held to 120 to 1080 px (APP_LIMITS.toldHeight; never stored, so above the agent\'s 800), as wide as the agent drew it; the card is measured again and the cards under it move, with nothing written to the ledger. The agent\'s `h` is the height until the panel tells one, and again once its frame is removed; a frozen panel keeps its last. A panel that tells nothing keeps the agent\'s size. Off, size-changed is ignored and the panel is the size the agent drew (docs/specification/apps.md § Panel size).',
  },
  goAfterPause: {
    // Off by default (maintainer, 2026-10-15, go-to-card task ruling 2: Enter goes, nothing goes by itself); ?flags=goAfterPause tries it.
    default: false,
    description: 'With the goToCard flag, the "Go to card" box also goes about 1 second after the last digit typed, without Enter (`GO_PAUSE`, apps/board/src/board/find/go-to-card.ts). Off, only Enter goes.',
  },
  findKeepsMarks: {
    // On by default (maintainer, 2026-10-28, point 322; search-and-finding FIND_01).
    default: true,
    description: 'Finding a card never changes it: going to a card from Go to card, search, the open, new and updated lists or the Review list selects and shows it without marking it seen, so its NEW and updated marks stay; the person\'s own click on the card, and every act, still clear them. Off, a found card is marked seen as a selected one is.',
  },
  accessByBot: {
    // On by default (maintainer, 2026-10-28, points 320 and 321; search-and-finding ACCESS_01).
    default: true,
    description: 'The access requests strip groups the requests by bot (the agent id the server stamps on each), named by its label, with each container\'s row and, for a bot with more than one request, one Allow all; the heading counts bots (two bots with one label are numbered). Off, one row per request under a count of requests.',
  },
  cardSearch: {
    // On by default (maintainer, 2026-10-28, points 317 and 322; tracker M7; search-and-finding SEARCH_02).
    default: true,
    description: 'The Go to card box also searches: `/` opens it, letters find cards by their title, text, notes, replies and container (words in any order, part of a word, case and accents ignored, best first); matches ring and the rest dim, ↓ and ↑ step, Enter goes, Esc clears. Digits still go to a card by number. Under a host too: the box draws inside the board\'s root (M27). Off, the box takes digits only.',
  },
  reviewList: {
    // On by default (maintainer, 2026-10-28, point 319; search-and-finding REVIEW_01).
    default: true,
    description: 'The proposals notice\'s Review opens a list of the cards with proposals (on two or more cards; with one card it goes straight there); choosing one brings the card into view at a readable zoom and opens its proposal box, keeping its marks. Off, Review opens the first proposal\'s box where the card is.',
  },
  containerZoom: {
    // On by default (maintainer, 2026-10-28: "click a container and then press Z to zoom to the entire container").
    default: true,
    description: 'A click on a container\'s empty inside or on its title line makes it the container Z zooms to: Z then fits the whole container on the stage, as the container finder does (`zoomToContainer`). A click on a card still makes Z zoom to the selected cards. Off, Z zooms only to a selection.',
  },
  agentAccessRules: {
    // On by default (maintainer, 2026-10-28, points 329, 331, 334; agent-access-and-working). The refusals are a fix and hold with it off.
    default: true,
    description: 'The side-panel agent may, without asking: read files inside the board\'s folder that the access rules allow (packages/agent/src/access-rules.ts), run shell commands that only read such files, and write in `.visionboard/images/` and `.visionboard/apps/`; a question inside the folder also offers "Allow for this folder", remembered. Off, every read outside the agent\'s own tools asks, as do those writes. Refused paths (`.env`, the bots\' secrets, the ledger, `.git/`) are refused either way.',
  },
  approvalHold: {
    // On by default (maintainer, 2026-10-28, point 335; agent-access-and-working HOLD_01). Read on the server (VB_FLAGS).
    default: true,
    description: 'A question the side-panel agent asks waits until the person answers, presses Stop or sends a new message, with no time limit; the turn\'s limit counts only the agent\'s own working time; Claude\'s hook waits up to 24 hours. Off, an unanswered question is a denial after 2 minutes and a turn stops after 10 minutes, waiting included.',
  },
  workAlongside: {
    // On by default (maintainer, 2026-10-28, point 328; agent-access-and-working WORK_01).
    default: true,
    description: 'While the board\'s agent works the board says so (and "waiting for your OK" while it asks), the person keeps working and can send more, and a reply that lands while the chat is closed or scrolled away shows a count on the chat button and a toast that opens it. Off, Send holds as "Waiting for agent" and a reply is only in the chat.',
  },
  answeredLaterChips: {
    // Off by default (maintainer, 2026-10-31, point 371): the counts are still made, for later uses.
    default: false,
    description: 'The toolbar shows the Answered and Later counts. Off, they are hidden and still counted.',
  },
  adaptiveHeader: {
    // On by default (maintainer, 2026-10-31, approved mock-up); ?flags=-adaptiveHeader turns it off.
    default: true,
    description: 'The header takes one of three forms by its own width, not the window\'s (board/chrome/header-tier.ts; needs versionView and toolbarMenu): full, one path "folder / board / version" and everything with its words; half, Version and Containers in "⋯" and the zoom as a small menu; a third, the board\'s name, a compact count, Send, Chat and "⋯", which holds the rest. Off, the toolbar is as it was.',
  },
  boardChromeInMount: {
    // On once the move held every page spec; removed at the plugin-mode set's close (maintainer, 2026-10-31, point 373; CHROME_01).
    default: true,
    description: 'The board\'s controls (toolbar, strips, dialogs, search, help) draw inside `mount`\'s root, so any host gets the whole board and the standalone page holds only what is truly its own. Off, the page draws them around the board as before.',
  },
  readAttachment: {
    // On by default (maintainer, 2026-10-30, points 361-368, D-071; read-attachment). Read on the page and the server (VB_FLAGS).
    default: true,
    description: 'The agent reads attached Word and Excel files and expands zips with the `read_attachment` tool; a PDF\'s pages become pictures in a sandbox when it is attached, and a picture over the limits gets a fitted copy. Off, the tool answers not-found (the tool list is generated, as for `appCards`) and attaching saves only the file itself.',
  },
  chatAttachments: {
    // On by default (maintainer, 2026-10-29, points 351-353, D-068; chat-attachments). Read on the page and the server (VB_FLAGS).
    default: true,
    description: 'The person attaches files to a chat message by dropping, pasting or the paperclip; each is saved under `.visionboard/attachments/` and the agent is told its path. Off, no paperclip, a dropped or pasted file does nothing new, the upload operation answers 404 and Send refuses `files`.',
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
