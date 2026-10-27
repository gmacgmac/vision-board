<!-- New board and Rename board (navigation BE_01, api.md 90): a small modal form opened from the
     board picker, its heading and fields from the action registry (BOARD_ACTIONS). Title is
     required, summary optional. It always opens fresh: New board empty, Rename with the board's
     title and summary, whatever was typed before a close (Cancel, Esc, a click on the backdrop). Create or Rename sends one `put_board` through the board's one
     sender (onsave); while it is on its way the button is busy, and a refusal stays in the dialog
     with the words kept. Native <dialog>: modal, Esc or Cancel closes, focus starts in the title
     and goes back to the picker on close. Opened, closed and closed by its backdrop by the shared
     modal dialog (`#ui` `syncModal`, `backdropClick`, `whenShut`). -->
<script lang="ts">
  import * as shellBoardsWords from './words/shell-boards.ts';
  import * as shellCommonWords from './words/shell-common.ts';
  import { BOARD_ACTIONS, type BoardActionId } from '#actions';
  import { LIMITS } from '#format';
  import type { BoardFields } from '../board/io.ts';
  import { shell } from './shell.svelte.ts';
  import { backdropClick, syncModal, whenShut } from '#ui';

  let { onsave }: { onsave: (action: BoardActionId, fields: BoardFields) => Promise<string | null> } = $props();

  let dlg: HTMLDialogElement;
  let titleInput: HTMLInputElement;
  let summaryInput: HTMLTextAreaElement;
  let title = $state('');
  let summary = $state('');
  let problem: string | null = $state(null);
  let saving = $state(false);
  const action = $derived(shell.boardDialog?.action ?? 'new-board');
  const rename = $derived(action === 'rename-board');

  $effect(() => {
    const req = shell.boardDialog;
    syncModal(dlg, !!req, () => {
      if (!req) return;
      [title, summary, problem, saving] = [req.title, req.summary, null, false];
      // The fields too, not only the state: words that arrived without an input event (autofill,
      // an input method) never reached the state, so the state's reset would not clear them.
      [titleInput.value, summaryInput.value] = [req.title, req.summary];
      titleInput.focus();
      titleInput.select();
    });
  });

  /** A click on the backdrop closes it like Cancel. */
  const backdrop = backdropClick(() => { if (!saving) shell.boardDialog = null; });

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (!shell.boardDialog || saving) return;
    const words = summary.trim();
    saving = true;
    problem = await onsave(action, { title: title.trim(), ...(words && { summary: words }) });
    saving = false;
    if (problem === null) shell.boardDialog = null;
  }
</script>

<dialog id="board-dialog" class="vb-dialog" aria-labelledby="board-dialog-title" aria-describedby="board-dialog-body"
  bind:this={dlg} onclose={whenShut(() => { shell.boardDialog = null; })} onclick={backdrop}>
  <form onsubmit={save}>
    <h2 id="board-dialog-title">{BOARD_ACTIONS[action].label}</h2>
    <p id="board-dialog-body" class="vb-dialog-item">
      {rename ? shellBoardsWords.theNewTitleShowsIn
        : shellBoardsWords.oneBoardPerTopicAn}
    </p>
    <label class="vb-field" for="board-title">{shellBoardsWords.title}</label>
    <input id="board-title" class="vb-input" required maxlength={LIMITS.title} autocomplete="off" spellcheck="true"
      pattern={'.*\\S.*'} title={shellBoardsWords.typeATitle} bind:value={title} bind:this={titleInput} />
    <label class="vb-field" for="board-summary">{shellBoardsWords.summary} <span class="vb-field-note">{shellBoardsWords.optional}</span></label>
    <textarea id="board-summary" rows="3" maxlength={LIMITS.summary} bind:value={summary} bind:this={summaryInput}></textarea>
    {#if problem}<p id="board-dialog-problem" class="vb-dialog-problem" role="alert">{problem}</p>{/if}
    <div class="vb-dialog-actions">
      <button type="button" class="vb-btn" id="board-cancel" onclick={() => { shell.boardDialog = null; }}>{shellCommonWords.cancel}</button>
      <button type="submit" class="vb-btn vb-btn-primary" id="board-save" disabled={saving} aria-busy={saving}>
        {saving ? (rename ? shellBoardsWords.renaming : shellCommonWords.creating) : rename ? shellBoardsWords.rename : shellCommonWords.create}
      </button>
    </div>
  </form>
</dialog>
