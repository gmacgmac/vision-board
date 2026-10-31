<!-- The board picker: a native select of the folder's boards, then New board…, Rename board… (boardEdit
     flag) and "Archived (N)…" (archiveBoard flag). The picker marks a board the person has not opened
     " · new" and one an agent wrote on since they last looked " · changed", never the open one. With
     `face` (adaptiveHeader flag) the select lies unseen over the board's name, cut with "…" (board.css
     `.vb-menu-face`), so the title shows once: the path's picker is the title. Toolbar.svelte draws this. -->
<script lang="ts" module>
  /** A board's or container's title as an option's words. */
  export const optionText = (title: string) => title.replace(/[&<>"]/g, '');
</script>
<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as commonWords from '../board/words/common.ts';
  import * as toolbarWords from './words/toolbar.ts';
  import { shell } from './shell.svelte.ts';
  import { BOARD_ACTION_IDS, BOARD_ACTIONS, type BoardActionId } from '#actions';
  import { flagOn } from '#format';
  import { pageFlags } from '../flags.ts';

  let { facts, onboard, id, face, look }: {
    /** What it shows: the page's (`shell`), or a gallery sample's. */
    facts: typeof shell;
    onboard: (id: string) => unknown;
    id: string;
    face?: Snippet | undefined;
    look?: 'hover' | 'focus' | 'pressed' | undefined;
  } = $props();

  const boardEdit = flagOn('boardEdit', pageFlags());
  const archiving = flagOn('archiveBoard', pageFlags());
  /** The picker entry that opens the Archived list: never a board id, which holds no ":". */
  const ARCHIVED = ':archived';
  /** A picker entry that opens the board dialog: never a board id, which holds no ":". */
  const entry = (a: BoardActionId) => `:${a}`;

  /** Open a board, or the dialog for a board action (the picker then shows the open board again). */
  function pick(select: HTMLSelectElement) {
    if (select.value === ARCHIVED) {
      select.value = facts.boardId;
      shell.archivedDialog = true;
      return;
    }
    const action = BOARD_ACTION_IDS.find((a) => entry(a) === select.value);
    // A note's unsaved words may ask first (M11_01-R3): Cancel leaves the picker on the open board.
    if (!action) return void Promise.resolve(onboard(select.value)).then(() => { select.value = facts.boardId; });
    select.value = facts.boardId;
    const rename = action === 'rename-board';
    shell.boardDialog = { action, title: rename ? facts.title : '', summary: rename ? facts.summary : '' };
  }
</script>

{#snippet picker(cls: string)}
  <label class="vb-visually-hidden" for={id}>{commonWords.board}</label>
  <select {id} class={cls} value={facts.boardId} onchange={(e) => pick(e.currentTarget)}>
    {#if !facts.boards.length}<option value="" disabled>{toolbarWords.noBoardsYet}</option>{/if}
    {#each facts.boards as b (b.board)}
      <option value={b.board}>{optionText(b.title)}{facts.versionView ? '' : ` · v${b.seq}`}{facts.boardMarks[b.board] ? ` · ${facts.boardMarks[b.board]}` : ''}</option>
    {/each}
    {#if boardEdit}
      <hr />
      {#each BOARD_ACTION_IDS as a (a)}
        {#if a === 'new-board' || facts.version !== null}
          <option value={entry(a)} disabled={!!facts.past}>{BOARD_ACTIONS[a].label}…</option>
        {/if}
      {/each}
    {/if}
    {#if archiving && facts.archived.length}
      {#if !boardEdit}<hr />{/if}
      <option value={ARCHIVED} disabled={!!facts.past}>{toolbarWords.archived(facts.archived.length)}</option>
    {/if}
  </select>
{/snippet}

{#if face}
  <span class="vb-path-part vb-path-board vb-menu-face" data-look={look} title={facts.boards.length ? facts.title : toolbarWords.noBoardsYet}>{@render face()}{@render picker('vb-menu-over')}</span>
{:else}
  {@render picker('vb-select')}
{/if}
