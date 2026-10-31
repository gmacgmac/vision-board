<!-- The confirm dialog for a decision that takes something away (rule 8): Remove access, and
     discarding a note's changed words (3_FE_04 step 4G); or that makes several at once: Accept all,
     which lists what it applies (ConfirmList, proposals FE_01). Native <dialog>: modal, Esc cancels, and
     Cancel is focused first so Enter never removes by accident. Opened by askConfirm() in
     shell.svelte.ts. The answer is taken on the button's submit or on Esc's cancel, for the request
     the dialog showed, and given on close (after the dialog has put focus back, so the asker can
     move it). A second ask can come before that close event: it is never the one answered. Opened by
     the shared modal dialog (`#ui` `syncModal`, base/dialog.css). -->
<script lang="ts">
  import * as chromeCommonWords from '../board/words/chrome-common.ts';
  import * as chromeConfirmWords from '../board/words/chrome-confirm.ts';
  import { shell } from './shell.svelte.ts';
  import ConfirmList from './ConfirmList.svelte';
  import { syncModal } from '#ui';

  let dlg: HTMLDialogElement;
  let cancel: HTMLButtonElement;

  $effect(() => {
    // Only opened here: the form's submit and Esc's cancel close it.
    if (shell.confirm) syncModal(dlg, true, () => { dlg.returnValue = ''; cancel.focus(); });
  });

  /** The request answered and how, until the dialog's close event gives the answer. */
  let answered: { req: NonNullable<typeof shell.confirm>; ok: boolean } | null = null;

  function answer(ok: boolean) {
    if (shell.confirm) answered = { req: shell.confirm, ok };
    shell.confirm = null;
  }

  function onclose() {
    const a = answered;
    answered = null;
    a?.req.resolve(a.ok);
  }
</script>

<dialog id="confirm-dialog" class="vb-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-body"
  bind:this={dlg} {onclose} oncancel={() => answer(false)}>
  <form method="dialog" onsubmit={(e) => answer((e.submitter as HTMLButtonElement | null)?.value === 'ok')}>
    <h2 id="confirm-title">{shell.confirm?.heading ?? chromeConfirmWords.areYouSure}</h2>
    <p id="confirm-body" class="vb-dialog-item">{shell.confirm?.body ?? ''}</p>
    {#if shell.confirm?.list}<ConfirmList list={shell.confirm.list} />{/if}
    <div class="vb-dialog-actions">
      <button type="submit" value="cancel" class="vb-btn" id="confirm-cancel" bind:this={cancel}>{chromeCommonWords.cancel}</button>
      <button type="submit" value="ok" class="vb-btn vb-btn-primary" id="confirm-ok">{shell.confirm?.confirm ?? chromeConfirmWords.confirm}</button>
    </div>
  </form>
</dialog>
