<!-- The open ledger's state in the board's header (readOnlyStart flag, D-085 5; READONLY_UI_01): "Read-only" with an eye,
     or "Editing" with a pencil while this server holds the ledger, after the path at every width of the header, as
     the Locked padlock is (header-tier.ts `editing`, never in "⋯"; decision 16). The word gives way at a third and
     on a crowded bar (styles/editing.css), the icon never; its tooltip and accessible name say the whole state, who
     edits too when another computer does (editing.ts `stateTip`). A chip that is a button (`#ui` chip.css
     `.vb-chip-btn`): it opens a small menu, the zoom menu's pattern (board/chrome toolbarPopup), with the state in
     words and its one row, Edit or Stop editing, which shows loading while the server answers; Edit refused stays
     read-only and says who holds the ledger in a toast. Beside it, always there, a polite status says a change of
     state. The page's state reads the folder again when the board's reads change their `readOnly` and when the
     menu opens. With nothing to say (the server opened for editing, the flag off there) it draws nothing. The
     gallery passes `folder`, `busy`, `open` and `look`. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { ButtonIcon, toolbarPopup } from '../board/chrome/index.ts';
  import { editState, readEditing, stateTip, toggleEditing } from './editing.ts';
  import type { FolderInfo } from './page-io.ts';
  import { shell } from './shell.svelte.ts';
  import * as editingWords from './words/editing.ts';

  let { id, look, folder = undefined, busy = undefined, open: forced = false }: {
    id?: string | undefined;
    look?: 'hover' | 'focus' | 'pressed' | undefined;
    /** The open folder's state (the gallery's); left out, the page's own. */
    folder?: Pick<FolderInfo, 'readOnly' | 'editing'> | null | undefined;
    /** Edit or Stop editing on its way (the gallery's); left out, the page's own. */
    busy?: 'edit' | 'stop' | null | undefined;
    /** Draw the menu open (the gallery's). */
    open?: boolean;
  } = $props();

  const own = $derived(folder === undefined);
  const here = $derived(own ? shell.folder : folder);
  const mode = $derived(editState(here));
  const going = $derived(busy === undefined ? shell.editBusy : busy);
  const tip = $derived(stateTip(here));
  const uid = $props.id();
  let root = $state<HTMLElement>();
  let button = $state<HTMLButtonElement>();
  let list = $state<HTMLElement>();
  const popup = toolbarPopup({ surface: () => list!, opener: () => button!, root: () => root! });
  const shown = $derived(forced || popup.open);
  // Nothing outlives the menu: closed with it.
  $effect(() => () => popup.close(false));
  // The board's reads say read-only, or no longer: the folder says who edits (the page's own chip only).
  $effect(() => {
    if (!own) return;
    void shell.readOnly;
    untrack(() => void readEditing());
  });
  /** What the status says: only a change, never the state the page opens in. */
  let said = $state('');
  let was: string | null = null;
  $effect(() => {
    const now = mode;
    untrack(() => {
      if (was !== null && was !== 'none' && now !== was && now !== 'none') said = now === 'editing' ? editingWords.nowEditing : editingWords.nowReadOnly;
      was = now;
    });
  });
  const word = $derived(going === 'edit' ? editingWords.opening : going === 'stop' ? editingWords.stopping : mode === 'editing' ? editingWords.editing : editingWords.readOnly);
  const action = $derived(mode === 'editing' ? editingWords.stopEditing : editingWords.edit);

  async function show() {
    if (own) void readEditing();
    await popup.show();
  }
</script>

{#if mode !== 'none'}
  <div class="vb-menu vb-editing" bind:this={root}>
    <button type="button" class="vb-chip vb-chip-btn vb-chip-editing" {id} data-state={mode} data-look={look} bind:this={button}
      title={tip} aria-label={tip} aria-haspopup="menu" aria-expanded={shown} aria-controls="vb-editing-{uid}" aria-busy={going ? true : undefined}
      onclick={() => (popup.open ? popup.close() : void show())}>
      {#if going}<span class="vb-spinner" aria-hidden="true"></span>{:else}<ButtonIcon name={mode === 'editing' ? 'pencil' : 'eye'} />{/if}
      <span class="vb-chip-word">{word}</span><ButtonIcon name="chevron" />
    </button>
    <div class="vb-menu-list" id="vb-editing-{uid}" role="menu" aria-label={editingWords.ledgerState} tabindex="-1" hidden={!shown} bind:this={list}>
      <p class="vb-menu-current vb-editing-line" role="none">{tip}</p>
      <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" aria-disabled={going ? true : undefined}
        title={mode === 'editing' ? editingWords.stopEditingTip : editingWords.editTip} onclick={() => popup.choose(() => void toggleEditing())}>
        <ButtonIcon name={mode === 'editing' ? 'eye' : 'pencil'} /><span class="vb-menu-label">{action}</span>
      </button>
    </div>
  </div>
{/if}
<span class="vb-visually-hidden" role="status">{said}</span>
