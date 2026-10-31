<!-- The page's folder in the board's header (currentFolder flag): FolderChip while the folder is known, as a
     chip in the path or, with `row` (the narrowest bar), a row of "⋯", which closes the menu first (`choose`). -->
<script lang="ts">
  import FolderChip from './FolderChip.svelte';
  import type { FolderInfo } from './page-io.ts';
  import { shell } from './shell.svelte.ts';

  let { id, look, choose, row, folder = undefined }: {
    id?: string | undefined;
    look?: 'hover' | 'focus' | 'pressed' | undefined;
    choose?: ((run: () => void) => void) | undefined;
    row?: string | undefined;
    /** The open folder (the gallery's); left out, the page's own. */
    folder?: Pick<FolderInfo, 'path' | 'name'> | null | undefined;
  } = $props();

  const here = $derived(folder === undefined ? shell.folder : folder);
  const open = () => { shell.folderDialog = true; };
</script>

{#if here}
  <FolderChip {...id && { id }} folder={here} {...look && { look }} {...row && { row }} onclick={() => (choose ? choose(open) : open())} />
{/if}
