<!-- The toolbar: board picker, board title and version, counts, the zoom group and the board-wide
     buttons. With the versionView flag (navigation FE_01) each fact shows once: the picker holds
     titles only, the title heading is for screen readers, and the version dropdown lists the open
     board's own versions, "now" first, then each past one with its time (board/versions.ts);
     choosing one shows the board as it was, read-only (VersionBanner), with no Agents or Send.
     With the containerFinder flag a Containers dropdown follows (board/finder.ts): choosing one zooms to it. The picker marks a board the person has not opened " · new" and one an agent wrote on
     since they last looked " · changed", never the open one, and a chip counts both (the conditions
     table, board/attention.ts; FE_01 ruling 1); the chip sits in the counts' live region.
     The end group (ToolbarEnd): zoom, then Send to agent and the board's Agents list with the agentAccess
     flag, Chat with the chatPanel flag (ChatSidebar), and with the toolbarMenu flag the "⋯" menu
     (ToolbarMenu) holding Theme, Hide decided and Reply.
     With the cardFlag flag the counts end in "N flagged" (board/flag-flow.ts) while any card is flagged
     and no past version shows: a button that focuses the next flagged card, wrapping.
     With the boardEdit flag the picker ends with New board… and Rename board… (navigation BE_01,
     BOARD_ACTIONS): each opens BoardDialog; both are off while a past version shows. With the archiveBoard
     flag it ends with "Archived (N)…" while any board is archived (N39 ruling 6), opening the Archived
     list (ArchivedDialog), and the "⋯" menu has Archive board… (ruling 5, ToolbarMenu). A locked board
     shows "Locked" after its name and version (LockedChip, N40 ruling 4); with the lockBoard flag the
     "⋯" menu has Lock board or Unlock board.
     The picker never goes under 220px from a 1024px window up; at 1500px and below the toolbar
     carries data-narrow, and the end group's text buttons shrink to icon buttons (ButtonIcon) and the
     counts show their numbers only (title and screen readers keep the words), all in board.css. -->
<script lang="ts">
  import { shell } from './shell.svelte.ts';
  import { MediaQuery } from 'svelte/reactivity';
  import AppIcon from './AppIcon.svelte';
  import FlaggedChip from './FlaggedChip.svelte';
  import LockedChip from './LockedChip.svelte';
  import ToolbarEnd from './ToolbarEnd.svelte';
  import { versionTime } from '../board/versions.ts';
  import { rowText } from '../board/finder.ts';
  import type { CommandId } from '../board/commands.ts';
  import { BOARD_ACTION_IDS, BOARD_ACTIONS, type BoardActionId } from '../../../../packages/actions/src/index.ts';
  import { flagOn } from '../../../../packages/format/src/index.ts';
  import { pageFlags } from '../flags.ts';

  let { onboard, onversion, ongo, oncommand, onhide, onsend, onrevoke, onflagged, onarchive, onlock }: {
    onboard: (id: string) => void;
    /** Show a past version of the open board, or now with null (versionView flag). */
    onversion: (seq: number | null) => Promise<void>;
    /** Zoom to a container (containerFinder flag, board/finder.ts). */
    ongo: (container: string) => void;
    oncommand: (id: CommandId) => void;
    onhide: () => void;
    onsend: () => Promise<string | null>;
    /** Remove an agent's access to the open board (BoardAgents). */
    onrevoke: (agent: string) => Promise<void>;
    /** The "N flagged" chip: the next flagged card (cardFlag flag). */
    onflagged: () => void;
    /** Archive board… in the "⋯" menu: ask, then archive the open board (archiveBoard flag). */
    onarchive: () => void;
    /** Lock board or Unlock board in the "⋯" menu (lockBoard flag): the open board. */
    onlock: () => void;
  } = $props();

  const THEMES = ['system', 'light', 'dark'] as const;
  type Theme = (typeof THEMES)[number];
  const stored = localStorage.getItem('vb-theme');
  let theme: Theme = $state(THEMES.includes(stored as Theme) ? (stored as Theme) : 'system');

  $effect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    localStorage.setItem('vb-theme', theme);
  });

  const nextTheme = () => { theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]!; };
  const label = (title: string) => title.replace(/[&<>"]/g, '');
  const updated = $derived(Object.keys(shell.boardMarks).length);

  const boardEdit = flagOn('boardEdit', pageFlags());
  const toolbarMenu = flagOn('toolbarMenu', pageFlags());
  const archiving = flagOn('archiveBoard', pageFlags());
  const locking = flagOn('lockBoard', pageFlags());
  /** The picker entry that opens the Archived list: never a board id, which holds no ":". */
  const ARCHIVED = ':archived';
  /** A narrow toolbar shows the end group's icons and bare counts (board.css `[data-narrow]`). */
  const narrow = new MediaQuery('max-width: 1500px');
  /** A picker entry that opens the board dialog: never a board id, which holds no ":". */
  const entry = (id: BoardActionId) => `:${id}`;

  /** Open a board, or the dialog for a board action (the picker then shows the open board again). */
  function pickBoard(select: HTMLSelectElement) {
    if (select.value === ARCHIVED) {
      select.value = shell.boardId;
      shell.archivedDialog = true;
      return;
    }
    const action = BOARD_ACTION_IDS.find((id) => entry(id) === select.value);
    if (!action) return onboard(select.value);
    select.value = shell.boardId;
    const rename = action === 'rename-board';
    shell.boardDialog = { action, title: rename ? shell.title : '', summary: rename ? shell.summary : '' };
  }

  /** Pick a version; the dropdown then shows what is on show (a failed read leaves the board as it was). */
  async function pickVersion(select: HTMLSelectElement) {
    await onversion(select.value === 'now' ? null : Number(select.value));
    select.value = String(shell.past?.seq ?? 'now');
  }
</script>

<header class="vb-toolbar" data-narrow={narrow.current || undefined} data-menu={toolbarMenu || undefined}>
  <AppIcon />
  {#if shell.versionView}<h1 id="title" class="vb-visually-hidden">{shell.title}</h1>{/if}
  <label class="vb-visually-hidden" for="board">Board</label>
  <select id="board" class="vb-select" value={shell.boardId}
    onchange={(e) => pickBoard(e.currentTarget)}>
    {#if !shell.boards.length}<option value="" disabled>No boards yet</option>{/if}
    {#each shell.boards as b (b.board)}
      <option value={b.board}>{label(b.title)}{shell.versionView ? '' : ` · v${b.seq}`}{shell.boardMarks[b.board] ? ` · ${shell.boardMarks[b.board]}` : ''}</option>
    {/each}
    {#if boardEdit}
      <hr />
      {#each BOARD_ACTION_IDS as id (id)}
        {#if id === 'new-board' || shell.version !== null}
          <option value={entry(id)} disabled={!!shell.past}>{BOARD_ACTIONS[id].label}…</option>
        {/if}
      {/each}
    {/if}
    {#if archiving && shell.archived.length}
      {#if !boardEdit}<hr />{/if}
      <option value={ARCHIVED} disabled={!!shell.past}>Archived ({shell.archived.length})…</option>
    {/if}
  </select>
  {#if !shell.versionView}
    <h1 id="title" class="vb-title">{shell.title}</h1>
    <span id="version" class="vb-chip" hidden={shell.version === null} title={shell.summary}>v{shell.version}</span>
  {:else if shell.version !== null}
    <label class="vb-visually-hidden" for="version">Version</label>
    <select id="version" class="vb-select" value={String(shell.past?.seq ?? 'now')}
      aria-busy={shell.loadingVersion} onchange={(e) => pickVersion(e.currentTarget)}>
      <option value="now">v{shell.version} · now</option>
      {#each shell.versions as v (v.seq)}
        <option value={String(v.seq)}>v{v.seq} · {versionTime(v.at)}</option>
      {/each}
    </select>
  {/if}
  <LockedChip id="locked" locked={shell.locked} />
  {#if shell.containers.length}
    <label class="vb-visually-hidden" for="containers">Containers</label>
    <select id="containers" class="vb-select vb-select-menu" value=""
      onchange={(e) => { if (e.currentTarget.value) ongo(e.currentTarget.value); e.currentTarget.value = ''; }}>
      <option value="">Containers</option>
      {#each shell.containers as c (c.id)}
        <option value={c.id} disabled={!c.usable}>{label(rowText(c))}</option>
      {/each}
    </select>
  {/if}
  <div id="counts" class="vb-counts" aria-live="polite">
    {#if updated}<span id="boards-updated" class="vb-chip" data-tone="new" title="{updated} board{updated === 1 ? '' : 's'} updated"><b>{updated}</b> <span class="vb-chip-word">board{updated === 1 ? '' : 's'} updated</span></span>{/if}
    {#if shell.version !== null}
      <span class="vb-chip" data-tone="open" title="Open items"><b>{shell.counts.open}</b> <span class="vb-chip-word">open</span></span>
      <span class="vb-chip" data-tone="decided" title="Decided items"><b>{shell.counts.decided}</b> <span class="vb-chip-word">decided</span></span>
      <span class="vb-chip" data-tone="later" title="Later items"><b>{shell.counts.later}</b> <span class="vb-chip-word">later</span></span>
      {#if shell.flagged && !shell.past}
        <FlaggedChip id="flagged" count={shell.flagged} onclick={onflagged} />
      {/if}
    {/if}
  </div>
  <ToolbarEnd {theme} ontheme={nextTheme} {oncommand} {onhide} {onsend} {onrevoke} onarchive={archiving ? onarchive : undefined} onlock={locking ? onlock : undefined} chat={shell.chatPanel} menu={toolbarMenu}
    holders={shell.agentAccess && shell.version !== null && !shell.past ? shell.boardHolders : null} />
</header>
