<!-- The Archived list's contents (archiveBoard flag, N39 ruling 6, api.md 137): the archived boards,
     the latest archived first, each with its name, when it was last updated and Restore; then
     Close. While one is being restored its button says so and every Restore waits (aria-disabled, so
     focus stays where it was); a refusal shows under the list, the list kept. With none left it says so. A view only: ArchivedDialog.svelte
     holds it in the modal dialog and does the restoring; the gallery draws it in each state. `uid`
     keeps its ids apart. Every control is a native button: Tab reaches each, Enter or Space chooses. -->
<script lang="ts">
  import * as shellBoardsWords from './words/shell-boards.ts';
  import type { ArchivedBoard } from '#actions';
  import { dayOf } from '../board/boards/index.ts';

  let { boards, uid, busy = null, problem = null, now = new Date(), onrestore, onclose }: {
    boards: readonly ArchivedBoard[];
    uid: string;
    /** Today, for "last updated" (the gallery fixes it). */
    now?: Date;
    /** The board being restored, while it is. */
    busy?: string | null;
    problem?: string | null;
    onrestore: (board: string) => void;
    onclose: () => void;
  } = $props();
</script>

<h2 id="{uid}-title">{shellBoardsWords.archivedBoards}</h2>
<p id="{uid}-body" class="vb-dialog-item">{shellBoardsWords.agentsDonTSeeThese}</p>
{#if boards.length}
  <ul class="vb-archived-list" aria-labelledby="{uid}-title" aria-busy={busy !== null}>
    {#each boards as b (b.board)}
      <li class="vb-archived-row">
        <span class="vb-archived-name">{b.title}</span>
        <span class="vb-archived-when">{shellBoardsWords.lastUpdated(dayOf(b.updated, now))}</span>
        <button type="button" class="vb-btn vb-archived-restore" data-board={b.board} aria-disabled={busy !== null}
          aria-busy={busy === b.board} aria-label={busy === b.board ? shellBoardsWords.restoring(b.title) : shellBoardsWords.restore(b.title)}
          onclick={() => { if (busy === null) onrestore(b.board); }}>{busy === b.board ? shellBoardsWords.restoring2 : shellBoardsWords.restore2}</button>
      </li>
    {/each}
  </ul>
{:else}
  <p class="vb-archived-empty">{shellBoardsWords.noArchivedBoards}</p>
{/if}
{#if problem}<p id="{uid}-problem" class="vb-dialog-problem" role="alert">{problem}</p>{/if}
<div class="vb-dialog-actions">
  <button type="button" class="vb-btn" id="{uid}-close" onclick={onclose}>{shellBoardsWords.close}</button>
</div>
