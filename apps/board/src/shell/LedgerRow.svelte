<!-- The page's New ledger… (ledgerFolders flag; LEDGER_UI_01), a row of the "⋯" menu's own after Open folder…, once the
     server names a ledger: it closes the menu and opens the New ledger dialog (LedgerDialog.svelte). At a third of the
     width the Ledger row above stands for it (its list ends in New ledger…), so the menu leaves it out there
     (ToolbarMenu.svelte `ledgerAbove`). The gallery passes `folder` and `placement` 'gallery'. -->
<script lang="ts">
  import { ButtonIcon } from '../board/chrome/index.ts';
  import type { FolderInfo } from './page-io.ts';
  import { shell } from './shell.svelte.ts';
  import * as ledgerWords from './words/ledgers.ts';

  let { choose, folder = undefined, placement = 'board' }: {
    choose: (run: () => void) => void;
    /** The open folder's ledger (the gallery's); left out, the page's own. */
    folder?: Pick<FolderInfo, 'ledger'> | null | undefined;
    placement?: 'board' | 'gallery';
  } = $props();

  const here = $derived(folder === undefined ? shell.folder : folder);
</script>

{#if here?.ledger}
  <button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" id={placement === 'board' ? 'new-ledger' : undefined}
    aria-haspopup="dialog" title={ledgerWords.newLedgerTip} onclick={() => choose(() => { shell.ledgerDialog = true; })}>
    <ButtonIcon name="ledger" /><span class="vb-menu-label">{ledgerWords.newLedger}</span>
  </button>
{/if}
