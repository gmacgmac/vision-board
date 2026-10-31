<!-- The open folder's chip (currentFolder flag, current-folder task), at the far left of the toolbar:
     a folder icon and the folder's own name (folder-path.ts `folderName`); the tooltip and the
     accessible name give the whole path with the home folder as `~` (`folderPath`). A press opens the
     folder dialog, as the "⋯" menu's Open folder… row does. It is the toolbar's chip look
     (board.css .vb-chip-btn): idle, hover, focus, pressed; it never leaves the toolbar, a long name
     is cut with "…" (styles/current-folder.css). With `row` (adaptiveHeader flag, the narrowest bar) it is a row
     of the "⋯" menu: the word, then the name. `look` draws a state without the pointer: the
     gallery's samples only. The toolbar and the gallery both draw this. -->
<script lang="ts">
  import * as foldersWords from './words/folders.ts';
  import ButtonIcon from './ButtonIcon.svelte';
  import { folderName, folderPath } from './folder-path.ts';
  import type { FolderInfo } from './page-io.ts';

  let { folder, onclick, id, look, row }: {
    folder: Pick<FolderInfo, 'path' | 'name'>;
    onclick: () => void;
    id?: string;
    look?: 'hover' | 'focus' | 'pressed';
    /** The row's word, in the "⋯" menu. */
    row?: string;
  } = $props();
  const path = $derived(folderPath(folder));
</script>

<button type="button" {id} class={row ? 'vb-menu-item' : 'vb-chip vb-chip-btn vb-folder-chip'} data-look={look} title={path}
  aria-label={foldersWords.folderOpenAnotherFolder(folderName(folder), path)} aria-haspopup="dialog" {onclick}>
  <ButtonIcon name="folder" />{#if row}<span class="vb-menu-label">{row}</span><span class="vb-menu-value">{folderName(folder)}</span>{:else}<span class="vb-folder-chip-name">{folderName(folder)}</span>{/if}
</button>
