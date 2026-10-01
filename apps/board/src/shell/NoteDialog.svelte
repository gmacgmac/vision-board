<!-- The note dialog for comments and "more context". Native <dialog>: modal, Esc closes, focus
     returns to the item that opened it. Opened by askNote() in shell.svelte.ts. -->
<script lang="ts">
  import { shell } from './shell.svelte.ts';

  let dlg: HTMLDialogElement;
  let input: HTMLTextAreaElement;
  let value = $state('');
  const blocked = $derived(!!shell.note?.required && !value.trim());

  $effect(() => {
    if (shell.note && !dlg.open) {
      value = '';
      dlg.returnValue = '';
      dlg.showModal();
      input.focus();
    }
  });

  function onclose() {
    const req = shell.note;
    shell.note = null;
    req?.resolve(dlg.returnValue === 'save' ? value.trim() : null);
  }

  function onkeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !blocked) {
      e.preventDefault();
      dlg.close('save');
    }
  }
</script>

<dialog id="note-dialog" class="vb-dialog" aria-labelledby="note-title" bind:this={dlg} {onclose}>
  <form method="dialog">
    <h2 id="note-title">{shell.note?.heading ?? 'Comment'}</h2>
    <p id="note-item" class="vb-dialog-item">{shell.note?.item ?? ''}</p>
    <label for="note-text" class="vb-visually-hidden">Your note</label>
    <textarea id="note-text" rows="5" maxlength="4000" placeholder={shell.note?.placeholder ?? ''}
      bind:value bind:this={input} {onkeydown}></textarea>
    <p class="vb-dialog-hint">⌘/Ctrl + Enter to save</p>
    <div class="vb-dialog-actions">
      <button type="submit" value="cancel" class="vb-btn">Cancel</button>
      <button type="submit" value="save" class="vb-btn vb-btn-primary" id="note-save" disabled={blocked}>Save</button>
    </div>
  </form>
</dialog>
