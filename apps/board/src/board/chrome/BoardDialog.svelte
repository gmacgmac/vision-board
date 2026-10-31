<!-- New board and Rename board (navigation BE_01, api.md 90): a small modal form opened from the
     board picker, its heading and fields from the action registry (BOARD_ACTIONS). Title is
     required, summary optional. It always opens fresh: New board empty, Rename with the board's
     title and summary, whatever was typed before a close (Cancel, Esc, a click on the backdrop). Create or Rename sends one `put_board` through the board's one
     sender (onsave); while it is on its way the button is busy, and a refusal stays in the dialog
     with the words kept. Native <dialog>: modal, Esc or Cancel closes, focus starts in the title
     and goes back to the picker on close. Opened, closed and closed by its backdrop by the shared
     modal dialog (`#ui` `syncModal`, `backdropClick`, `whenShut`). -->
<script lang="ts">
  import * as chromeBoardsWords from '../words/chrome-boards.ts';
  import * as chromeCommonWords from '../words/chrome-common.ts';
  import { BOARD_ACTIONS, type BoardActionId } from '#actions';
  import { LIMITS } from '#format';
  import type { BoardFields } from '../io.ts';
  import { useChrome } from './chrome.svelte.ts';
  import { backdropClick, syncModal, whenShut } from '#ui';

  let { onsave }: { onsave: (action: BoardActionId, fields: BoardFields) => Promise<string | null> } = $props();

  const { state: shown, id } = useChrome();
  let dlg: HTMLDialogElement;
  let titleInput: HTMLInputElement;
  let summaryInput: HTMLTextAreaElement;
  let title = $state('');
  let summary = $state('');
  let problem: string | null = $state(null);
  let saving = $state(false);
  const action = $derived(shown.boardDialog?.action ?? 'new-board');
  const rename = $derived(action === 'rename-board');

  $effect(() => {
    const req = shown.boardDialog;
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
  const backdrop = backdropClick(() => { if (!saving) shown.boardDialog = null; });

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (!shown.boardDialog || saving) return;
    const words = summary.trim();
    saving = true;
    problem = await onsave(action, { title: title.trim(), ...(words && { summary: words }) });
    saving = false;
    if (problem === null) shown.boardDialog = null;
  }
</script>

<dialog id={id('board-dialog')} class="vb-dialog" aria-labelledby={id('board-dialog-title')} aria-describedby={id('board-dialog-body')}
  bind:this={dlg} onclose={whenShut(() => { shown.boardDialog = null; })} onclick={backdrop}>
  <form onsubmit={save}>
    <h2 id={id('board-dialog-title')}>{BOARD_ACTIONS[action].label}</h2>
    <p id={id('board-dialog-body')} class="vb-dialog-item">
      {rename ? chromeBoardsWords.theNewTitleShowsIn
        : chromeBoardsWords.oneBoardPerTopicAn}
    </p>
    <label class="vb-field" for={id('board-title')}>{chromeBoardsWords.title}</label>
    <input id={id('board-title')} class="vb-input" required maxlength={LIMITS.title} autocomplete="off" spellcheck="true"
      pattern={'.*\\S.*'} title={chromeBoardsWords.typeATitle} value={title} oninput={(e) => { title = e.currentTarget.value; }} bind:this={titleInput} />
    <label class="vb-field" for={id('board-summary')}>{chromeBoardsWords.summary} <span class="vb-field-note">{chromeBoardsWords.optional}</span></label>
    <textarea id={id('board-summary')} rows="3" maxlength={LIMITS.summary} value={summary} oninput={(e) => { summary = e.currentTarget.value; }} bind:this={summaryInput}></textarea>
    {#if problem}<p id={id('board-dialog-problem')} class="vb-dialog-problem" role="alert">{problem}</p>{/if}
    <div class="vb-dialog-actions">
      <button type="button" class="vb-btn" id={id('board-cancel')} onclick={() => { shown.boardDialog = null; }}>{chromeCommonWords.cancel}</button>
      <button type="submit" class="vb-btn vb-btn-primary" id={id('board-save')} disabled={saving} aria-busy={saving}>
        {saving ? (rename ? chromeBoardsWords.renaming : chromeCommonWords.creating) : rename ? chromeBoardsWords.rename : chromeCommonWords.create}
      </button>
    </div>
  </form>
</dialog>
