<!-- The open folder's chip (currentFolder flag, current-folder task), at the far left of the toolbar:
     a folder icon and the folder's own name (board/folder-path.ts `folderName`); the tooltip and the
     accessible name give the whole path with the home folder as `~` (`folderPath`). A press opens the
     folder dialog, as the "⋯" menu's Open folder… row does. It is the toolbar's chip look
     (board.css .vb-chip-btn): idle, hover, focus, pressed; it never leaves the toolbar, a long name
     is cut with "…" (styles/current-folder.css). `look` draws a state without the pointer: the
     gallery's samples only. The toolbar and the gallery both draw this. -->
<script lang="ts">
  import ButtonIcon from './ButtonIcon.svelte';
  import { folderName, folderPath } from '../board/folder-path.ts';
  import type { FolderInfo } from '../board/io.ts';

  let { folder, onclick, id, look }: {
    folder: Pick<FolderInfo, 'path' | 'name'>;
    onclick: () => void;
    id?: string;
    look?: 'hover' | 'focus' | 'pressed';
  } = $props();
  const path = $derived(folderPath(folder));
</script>

<button type="button" {id} class="vb-chip vb-chip-btn vb-folder-chip" data-look={look} title={path}
  aria-label="Folder {folderName(folder)}: {path}. Open another folder" aria-haspopup="dialog" {onclick}>
  <ButtonIcon name="folder" /><span class="vb-folder-chip-name">{folderName(folder)}</span>
</button>
