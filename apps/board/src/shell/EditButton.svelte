<!-- Edit, or Stop editing while this server holds the ledger (readOnlyStart flag, D-085 2; READONLY_UI_01): a button
     after the state chip on a full header, where there is room (styles/editing.css; under about 1500px its pencil
     alone, its word kept for screen readers and its tooltip, as the end group's buttons), or with `choose` a row of
     "⋯" at half and a third (header-tier.ts `edit`; among the fields moved from the bar, HeaderFields.svelte, so a
     plain button as FlaggedChip's row is), which closes the menu first. The chip's own menu has it too
     (EditChip.svelte). Pressed, it shows loading (a spinner, "Opening for editing…" or "Stopping…", aria-busy and
     aria-disabled, focus kept) until the server answers. Its icon is what it turns the ledger to: a pencil for Edit, the
     read-only eye for Stop editing: then the chip says Editing, or Read-only again; a refused
     Edit is a toast naming who holds the ledger (editing.ts `toggleEditing`). Nothing to say, it draws nothing. The
     gallery passes `folder`, `busy` and `look`. -->
<script lang="ts">
  import { ButtonIcon } from '../board/chrome/index.ts';
  import { editState, toggleEditing } from './editing.ts';
  import type { FolderInfo } from './page-io.ts';
  import { shell } from './shell.svelte.ts';
  import * as editingWords from './words/editing.ts';

  let { id, look, choose, folder = undefined, busy = undefined }: {
    id?: string | undefined;
    look?: 'hover' | 'focus' | 'pressed' | undefined;
    /** In the "⋯" menu: close it, then act. */
    choose?: ((run: () => void) => void) | undefined;
    /** The open folder's state (the gallery's); left out, the page's own. */
    folder?: Pick<FolderInfo, 'readOnly' | 'editing'> | null | undefined;
    /** Edit or Stop editing on its way (the gallery's); left out, the page's own. */
    busy?: 'edit' | 'stop' | null | undefined;
  } = $props();

  const mode = $derived(editState(folder === undefined ? shell.folder : folder));
  const going = $derived(busy === undefined ? shell.editBusy : busy);
  const stop = $derived(mode === 'editing');
  const word = $derived(going === 'edit' ? editingWords.opening : going === 'stop' ? editingWords.stopping : stop ? editingWords.stopEditing : editingWords.edit);
  const tip = $derived(stop ? editingWords.stopEditingTip : editingWords.editTip);

  function press() {
    if (going) return;
    if (choose) choose(() => void toggleEditing());
    else void toggleEditing();
  }
</script>

{#snippet face()}
  {#if going}<span class="vb-spinner" aria-hidden="true"></span>{:else}<ButtonIcon name={stop ? 'eye' : 'pencil'} />{/if}
{/snippet}

{#if mode !== 'none'}
  {#if choose}
    <button type="button" class="vb-menu-item" {id} title={tip} aria-busy={going ? true : undefined}
      aria-disabled={going ? true : undefined} onclick={press}>
      {@render face()}<span class="vb-menu-label">{word}</span>
    </button>
  {:else}
    <button type="button" class="vb-btn vb-btn-iconic vb-edit-btn" {id} data-state={stop ? 'editing' : 'read-only'} data-look={look} title={tip}
      aria-busy={going ? true : undefined} aria-disabled={going ? true : undefined} onclick={press}>
      {@render face()}<span class="vb-btn-text">{word}</span>
    </button>
  {/if}
{/if}
