<!-- The page's Open folder… (openFolder flag), last in the "⋯" menu: it opens the folder picker
     (FolderDialog.svelte); its tooltip names the open folder; with the currentFolder flag a plain line under it,
     "Current: ~/…/name" (the middle of a long path elided, the whole path in its tooltip; not a row, so the
     menu's keys skip it). The gallery passes `folder`, `current` and `placement` 'gallery'. -->
<script lang="ts">
  import * as toolbarWords from '../board/words/toolbar.ts';
  import { ButtonIcon } from '../board/chrome/index.ts';
  import { currentFolderOn } from './folder.ts';
  import { elidePath, folderPath } from './folder-path.ts';
  import type { FolderInfo } from './page-io.ts';
  import { shell } from './shell.svelte.ts';

  let { choose, folder = undefined, current = undefined, placement = 'board' }: {
    choose: (run: () => void) => void;
    /** The open folder (the gallery's); left out, the page's own. */
    folder?: Pick<FolderInfo, 'path' | 'name'> | null | undefined;
    /** Show the Current line (the gallery's); left out, the currentFolder flag. */
    current?: boolean | undefined;
    placement?: 'board' | 'gallery';
  } = $props();

  const here = $derived(folder === undefined ? shell.folder : folder);
  const tip = $derived(here ? toolbarWords.openAnotherFolderOpenNow(here.name) : toolbarWords.openAProjectFolder);
  const showCurrent = $derived(current ?? currentFolderOn());
  /** The Current line's longest path before its middle is elided (the menu is 220 to 360px wide). */
  const CURRENT_MAX = 32;
</script>

<button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={placement === 'board' ? 'open-folder' : undefined}
  aria-haspopup="dialog" title={tip} onclick={() => choose(() => { shell.folderDialog = true; })}>
  <ButtonIcon name="folder" /><span class="vb-menu-label">{toolbarWords.openFolder2}</span>
</button>
{#if showCurrent && here}
  <p class="vb-menu-current" role="none" title={folderPath(here)}>{toolbarWords.current} <b>{elidePath(folderPath(here), CURRENT_MAX)}</b></p>
{/if}
