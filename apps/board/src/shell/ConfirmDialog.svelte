<!-- The confirm dialog for a decision that takes something away (rule 8): Remove access. Native
     <dialog>: modal, Esc cancels, and Cancel is focused first so Enter never removes by
     accident. Opened by askConfirm() in shell.svelte.ts. -->
<script lang="ts">
  import { shell } from './shell.svelte.ts';

  let dlg: HTMLDialogElement;
  let cancel: HTMLButtonElement;

  $effect(() => {
    if (shell.confirm && !dlg.open) {
      dlg.returnValue = '';
      dlg.showModal();
      cancel.focus();
    }
  });

  function onclose() {
    const req = shell.confirm;
    shell.confirm = null;
    req?.resolve(dlg.returnValue === 'ok');
  }
</script>

<dialog id="confirm-dialog" class="vb-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-body"
  bind:this={dlg} {onclose}>
  <form method="dialog">
    <h2 id="confirm-title">{shell.confirm?.heading ?? 'Are you sure?'}</h2>
    <p id="confirm-body" class="vb-dialog-item">{shell.confirm?.body ?? ''}</p>
    <div class="vb-dialog-actions">
      <button type="submit" value="cancel" class="vb-btn" id="confirm-cancel" bind:this={cancel}>Cancel</button>
      <button type="submit" value="ok" class="vb-btn vb-btn-primary" id="confirm-ok">{shell.confirm?.confirm ?? 'Confirm'}</button>
    </div>
  </form>
</dialog>
